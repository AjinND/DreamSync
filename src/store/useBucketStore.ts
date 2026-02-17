import { create } from 'zustand';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { ItemService } from '../services/items';
import { expenseSchema, inspirationSchema, progressSchema, reflectionSchema, safeValidate } from '../services/validation';
import { BucketItem, Expense, Inspiration, Memory, Phase, ProgressEntry, Reflection } from '../types/item';
import { getUserMessage } from '../utils/AppError';

interface BucketState {
    items: BucketItem[];
    filteredItems: BucketItem[];
    itemMap: Record<string, BucketItem>;
    loading: boolean;
    isFetchingMore: boolean;
    hasMore: boolean;
    itemsCursor: QueryDocumentSnapshot<DocumentData> | null;
    error: string | null;
    searchQuery: string;
    fetchItems: () => Promise<void>;
    fetchMore: () => Promise<void>;
    searchItems: (query: string) => void;
    addItem: (item: Omit<BucketItem, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
    updatePhase: (id: string, newPhase: Phase) => Promise<void>;
    updateItem: (id: string, updates: Partial<BucketItem>) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    // Sub-item helpers
    addInspiration: (itemId: string, inspiration: Omit<Inspiration, 'id'>) => Promise<void>;
    deleteInspiration: (itemId: string, inspirationId: string) => Promise<void>;
    addMemory: (itemId: string, memory: Omit<Memory, 'id'> & { id?: string }) => Promise<void>;
    deleteMemory: (itemId: string, memoryId: string) => Promise<void>;
    addReflection: (itemId: string, reflection: Omit<Reflection, 'id'>) => Promise<void>;
    addProgress: (itemId: string, entry: Omit<ProgressEntry, 'id'>) => Promise<void>;
    addExpense: (itemId: string, expense: Omit<Expense, 'id'>) => Promise<void>;
    // Real-time subscription tracking
    activeSubscriptions: Record<string, () => void>;
    subscribeToItem: (itemId: string, onUpdate: (item: BucketItem) => void) => void;
    unsubscribeFromItem: (itemId: string) => void;
    clearSubscriptions: () => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Firestore doesn't accept undefined values, so we need to remove them
const cleanForFirestore = <T extends object>(obj: T): T => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    ) as T;
};

const applySearchFilter = (items: BucketItem[], query: string): BucketItem[] => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
        item.title.toLowerCase().includes(normalized) ||
        (item.description || '').toLowerCase().includes(normalized)
    );
};

export const useBucketStore = create<BucketState>((set, get) => ({
    items: [],
    filteredItems: [],
    itemMap: {},
    loading: false,
    isFetchingMore: false,
    hasMore: true,
    itemsCursor: null,
    error: null,
    searchQuery: '',
    activeSubscriptions: {},

    fetchItems: async () => {
        set({ loading: true, error: null });
        try {
            // Lazy imports before parallel fetch
            const { auth } = await import('../../firebaseConfig');
            const { JourneysService } = await import('../services/journeys');
            const userId = auth.currentUser?.uid;

            // 1 & 2. Parallelize Owned Items + Joined Journeys queries
            const [ownedPage, myJourneys] = await Promise.all([
                ItemService.getUserItemsPaginated({ pageSize: 20, cursor: null }),
                userId ? JourneysService.getUserJourneys(userId) : Promise.resolve([]),
            ]);
            const ownedItems = ownedPage.items;

            // 3. Fetch shared dream items from joined journeys
            let sharedItems: BucketItem[] = [];
            if (userId && myJourneys.length > 0) {
                // Filter journeys I don't own (since my owned items are already fetched above)
                const joinedJourneys = myJourneys.filter(j => j.ownerId !== userId);

                if (joinedJourneys.length > 0) {
                    const dreamIds = joinedJourneys.map(j => j.dreamId);
                    // Fetch the actual dream items
                    sharedItems = await ItemService.getItemsByIds(dreamIds);
                }
            }

            // 3. Merge Lists (Owned + Shared)
            // Use Map to dedupe in case logic overlaps (though filter above should prevent it)
            const itemMap: Record<string, BucketItem> = {};
            ownedItems.forEach(i => itemMap[i.id] = i);
            sharedItems.forEach(i => itemMap[i.id] = i);

            const allItems = Object.values(itemMap);
            // Sort by createdAt desc
            allItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            set({
                items: allItems,
                filteredItems: allItems,
                itemMap,
                loading: false,
                itemsCursor: ownedPage.lastDoc,
                hasMore: ownedPage.hasMore,
                searchQuery: '',
            });
        } catch (e: any) {
            set({ error: getUserMessage(e), loading: false });
        }
    },

    fetchMore: async () => {
        const { isFetchingMore, hasMore, itemsCursor, itemMap } = get();
        if (isFetchingMore || !hasMore) return;

        set({ isFetchingMore: true, error: null });
        try {
            const page = await ItemService.getUserItemsPaginated({ pageSize: 20, cursor: itemsCursor });
            const mergedMap = { ...itemMap };
            page.items.forEach((item) => {
                mergedMap[item.id] = item;
            });
            const mergedItems = Object.values(mergedMap).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const query = get().searchQuery.trim().toLowerCase();
            const filtered = query
                ? mergedItems.filter((item) =>
                    item.title.toLowerCase().includes(query) ||
                    (item.description || '').toLowerCase().includes(query)
                )
                : mergedItems;

            set({
                items: mergedItems,
                filteredItems: filtered,
                itemMap: mergedMap,
                itemsCursor: page.lastDoc,
                hasMore: page.hasMore,
                isFetchingMore: false,
            });
        } catch (e: any) {
            set({ isFetchingMore: false, error: getUserMessage(e) });
        }
    },

    searchItems: (query: string) => {
        const items = get().items;
        const filtered = applySearchFilter(items, query);
        set({ searchQuery: query, filteredItems: filtered });
    },

    addItem: async (itemData) => {
        set({ loading: true });
        try {
            await ItemService.createItem(itemData);
            await get().fetchItems();

            // Update user stats if public
            if (itemData.isPublic) {
                const { UsersService } = await import('../services/users');
                await UsersService.incrementPublicDreamsCount(1);
            }
        } catch (e: any) {
            set({ error: getUserMessage(e), loading: false });
            throw e;
        }
    },

    updatePhase: async (id, phase) => {
        const prevItems = get().items;
        const prevItemMap = get().itemMap;
        const prevItem = prevItemMap[id];
        const wasDone = prevItem?.phase === 'done';

        // Optimistic update - update BOTH items and itemMap
        const now = Date.now();
        const updatedItems = prevItems.map(i => {
            if (i.id !== id) return i;
            return phase === 'done'
                ? { ...i, phase, completedAt: now }
                : { ...i, phase };
        });

        const updatedItem = updatedItems.find(i => i.id === id);
        const updatedItemMap = { ...prevItemMap };
        if (updatedItem) {
            updatedItemMap[id] = updatedItem;
        }

        set({
            items: updatedItems,
            filteredItems: applySearchFilter(updatedItems, get().searchQuery),
            itemMap: updatedItemMap
        });

        try {
            await ItemService.updateItem(
                id,
                phase === 'done'
                    ? { phase, completedAt: now }
                    : { phase, completedAt: undefined as any }
            );

            // Update completed count when transitioning into or out of done
            if (!wasDone && phase === 'done') {
                const { UsersService } = await import('../services/users');
                await UsersService.incrementCompletedDreamsCount(1);
            } else if (wasDone && phase !== 'done') {
                const { UsersService } = await import('../services/users');
                await UsersService.incrementCompletedDreamsCount(-1);
            }

            // Sync to community store if item is public
            if (updatedItem?.isPublic) {
                const { useCommunityStore } = await import('./useCommunityStore');

                // If changing to 'dream' phase, remove from community (private planning)
                // Otherwise, upsert into community (handles both add and update)
                if (phase === 'dream') {
                    useCommunityStore.getState().removeDream(id);
                } else {
                    useCommunityStore.getState().upsertDream(updatedItem);
                }
            }
        } catch (e: any) {
            set({
                items: prevItems,
                filteredItems: applySearchFilter(prevItems, get().searchQuery),
                itemMap: prevItemMap,
                error: getUserMessage(e)
            });
            throw e;
        }
    },

    updateItem: async (id, updates) => {
        const prevItems = get().items;
        const prevItemMap = get().itemMap;
        try {
            const oldItem = get().itemMap[id];
            const wasPublic = oldItem?.isPublic || false;
            const wasDone = oldItem?.phase === 'done';

            let processedUpdates = { ...updates };
            const isVisibilityChange = 'isPublic' in updates && oldItem && updates.isPublic !== oldItem.isPublic;

            // Optimistic update for non-visibility transitions.
            if (!isVisibilityChange && oldItem) {
                const optimisticItem = { ...oldItem, ...processedUpdates };
                set((state) => {
                    const updatedItems = state.items.map(i => i.id === id ? optimisticItem : i);
                    return {
                        items: updatedItems,
                        filteredItems: applySearchFilter(updatedItems, state.searchQuery),
                        itemMap: { ...state.itemMap, [id]: optimisticItem },
                    };
                });
            }

            if ('isPublic' in updates && oldItem) {
                // Visibility transition requires rewriting fields so ItemService can
                // re-encrypt according to policy (public restricted fields vs private full fields).
                const targetIsPublic = updates.isPublic === true;
                processedUpdates = {
                    ...oldItem,
                    ...updates,
                    isPublic: targetIsPublic,
                };
                delete (processedUpdates as any).id;
                delete (processedUpdates as any).userId;
                delete (processedUpdates as any).createdAt;

                // Handle image path migration when visibility changes
                if (oldItem.mainImage && wasPublic !== updates.isPublic) {
                    const { StorageService, StoragePaths } = await import('../services/storage');
                    const userId = oldItem.userId;
                    const dreamId = oldItem.id;

                    try {
                        // Determine old and new paths based on visibility transition
                        const oldPath = StoragePaths.dreamCover(userId, dreamId, wasPublic);
                        const newPath = StoragePaths.dreamCover(userId, dreamId, updates.isPublic === true);

                        // Migrate image to new path
                        const newImageUrl = await StorageService.migrateImagePath(oldPath, newPath);
                        processedUpdates.mainImage = newImageUrl;
                    } catch (migrationError) {
                        console.warn('Failed to migrate dream cover image:', migrationError);
                        // Continue without migrating image - it will still be accessible
                    }
                }
            }

            await ItemService.updateItem(id, processedUpdates, { currentIsPublic: oldItem?.isPublic ?? false });

            // For visibility transitions, re-fetch because encryption/state may change.
            // Non-visibility transitions were applied optimistically above.
            if (isVisibilityChange) {
                await get().fetchItems();
            }

            const newItem = get().itemMap[id];
            const isNowPublic = newItem?.isPublic || false;
            const isNowDone = newItem?.phase === 'done';

            // Calculate stat changes
            const { UsersService } = await import('../services/users');
            const statUpdates: any = {};

            // Public dreams count
            if (!wasPublic && isNowPublic) {
                statUpdates.publicDreamsCount = 1;
            } else if (wasPublic && !isNowPublic) {
                statUpdates.publicDreamsCount = -1;
            }

            // Completed dreams count
            if (!wasDone && isNowDone) {
                statUpdates.completedDreamsCount = 1;
            } else if (wasDone && !isNowDone) {
                statUpdates.completedDreamsCount = -1;
            }

            // Update stats if needed
            if (Object.keys(statUpdates).length > 0) {
                await UsersService.updateUserStats(statUpdates);
            }

            // Sync to community store if item is public
            const item = get().itemMap[id];
            if (item?.isPublic) {
                const { useCommunityStore } = await import('./useCommunityStore');

                // If updating phase to 'dream', remove from community (private planning)
                // Otherwise, upsert into community (handles both add and update)
                if (item.phase === 'dream') {
                    useCommunityStore.getState().removeDream(id);
                } else {
                    useCommunityStore.getState().upsertDream(item);
                }
            }
        } catch (e: any) {
            set({
                items: prevItems,
                filteredItems: applySearchFilter(prevItems, get().searchQuery),
                itemMap: prevItemMap,
                error: getUserMessage(e)
            });
            throw e;
        }
    },

    deleteItem: async (id) => {
        try {
            // Capture item before deletion for Storage cleanup AND stats
            const item = get().itemMap[id];
            const [memories, progressEntries] = await Promise.all([
                ItemService.getMemories(id).catch(() => []),
                ItemService.getProgress(id).catch(() => []),
            ]);

            await ItemService.deleteItem(id);
            set(state => {
                const updatedItems = state.items.filter(i => i.id !== id);
                return {
                    items: updatedItems,
                    filteredItems: applySearchFilter(updatedItems, state.searchQuery),
                    itemMap: Object.fromEntries(
                        Object.entries(state.itemMap).filter(([key]) => key !== id)
                    ),
                };
            });

            // Update user stats if needed
            if (item) {
                const { UsersService } = await import('../services/users');
                const statUpdates: any = {};

                if (item.isPublic) {
                    statUpdates.publicDreamsCount = -1;
                }

                if (item.phase === 'done') {
                    statUpdates.completedDreamsCount = -1;
                }

                if (Object.keys(statUpdates).length > 0) {
                    await UsersService.updateUserStats(statUpdates);
                }

                // Best-effort Storage cleanup (non-blocking)
                const { auth } = await import('../../firebaseConfig');
                const { StorageService } = await import('../services/storage');
                const userId = auth.currentUser?.uid;
                if (userId) {
                    StorageService.deleteDreamAssets(userId, id, {
                        ...(item || {}),
                        memories,
                        progress: progressEntries,
                    } as BucketItem).catch(() => {
                        // Silently ignore — best effort
                    });
                }
            }
        } catch (e: any) {
            set({ error: getUserMessage(e) });
            throw e;
        }
    },

    addInspiration: async (itemId, inspiration) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        const validation = safeValidate(inspirationSchema, inspiration);
        if (!validation.success) {
            throw new Error(`Validation failed: ${validation.error}`);
        }
        const newInsp = cleanForFirestore({ ...inspiration, id: generateId() });
        await ItemService.addInspiration(itemId, newInsp as Inspiration);
        set((state) => {
            const current = state.itemMap[itemId];
            if (!current) return state;
            const mergedItem = { ...current, inspirations: [...(current.inspirations || []), newInsp as Inspiration] };
            const updatedItems = state.items.map((i) => (i.id === itemId ? mergedItem : i));
            return {
                items: updatedItems,
                filteredItems: applySearchFilter(updatedItems, state.searchQuery),
                itemMap: { ...state.itemMap, [itemId]: mergedItem },
            };
        });
    },

    deleteInspiration: async (itemId, inspirationId) => {
        await ItemService.deleteInspiration(itemId, inspirationId);
        set((state) => {
            const current = state.itemMap[itemId];
            if (!current) return state;
            const mergedItem = {
                ...current,
                inspirations: (current.inspirations || []).filter(i => i.id !== inspirationId),
            };
            const updatedItems = state.items.map((i) => (i.id === itemId ? mergedItem : i));
            return {
                items: updatedItems,
                filteredItems: applySearchFilter(updatedItems, state.searchQuery),
                itemMap: { ...state.itemMap, [itemId]: mergedItem },
            };
        });
    },

    addMemory: async (itemId, memory) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        const newMem = cleanForFirestore({ ...memory, id: memory.id || generateId() });
        await ItemService.addMemory(itemId, newMem as Memory);
        set((state) => {
            const current = state.itemMap[itemId];
            if (!current) return state;
            const mergedItem = { ...current, memories: [...(current.memories || []), newMem as Memory] };
            const updatedItems = state.items.map((i) => (i.id === itemId ? mergedItem : i));
            return {
                items: updatedItems,
                filteredItems: applySearchFilter(updatedItems, state.searchQuery),
                itemMap: { ...state.itemMap, [itemId]: mergedItem },
            };
        });
    },

    deleteMemory: async (itemId, memoryId) => {
        const item = get().itemMap[itemId];
        if (!item) return;

        const memoryToDelete = (item.memories || []).find((m) => m.id === memoryId);

        await ItemService.deleteMemory(itemId, memoryId);
        set((state) => {
            const current = state.itemMap[itemId];
            if (!current) return state;
            const mergedItem = {
                ...current,
                memories: (current.memories || []).filter((m) => m.id !== memoryId),
            };
            const updatedItems = state.items.map((i) => (i.id === itemId ? mergedItem : i));
            return {
                items: updatedItems,
                filteredItems: applySearchFilter(updatedItems, state.searchQuery),
                itemMap: { ...state.itemMap, [itemId]: mergedItem },
            };
        });

        // Best-effort storage cleanup.
        const { StoragePaths, StorageService } = await import('../services/storage');
        const isPublic = item.isPublic === true;
        const deterministicPath = StoragePaths.dreamMemory(item.userId, item.id, memoryId, isPublic);

        await Promise.allSettled([
            StorageService.deleteImage(deterministicPath),
            memoryToDelete?.imageUrl ? StorageService.deleteImageByUrl(memoryToDelete.imageUrl) : Promise.resolve(),
        ]);
    },

    addReflection: async (itemId, reflection) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        if (item.phase !== 'done') {
            throw new Error('Reflections can be added only when dream is completed');
        }
        const validation = safeValidate(reflectionSchema, reflection);
        if (!validation.success) {
            throw new Error(`Validation failed: ${validation.error}`);
        }
        const newRef = cleanForFirestore({ ...reflection, id: generateId() });
        await ItemService.addReflection(itemId, newRef as Reflection);
        set((state) => {
            const current = state.itemMap[itemId];
            if (!current) return state;
            const mergedItem = { ...current, reflections: [...(current.reflections || []), newRef as Reflection] };
            const updatedItems = state.items.map((i) => (i.id === itemId ? mergedItem : i));
            return {
                items: updatedItems,
                filteredItems: applySearchFilter(updatedItems, state.searchQuery),
                itemMap: { ...state.itemMap, [itemId]: mergedItem },
            };
        });
    },

    addProgress: async (itemId, entry) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        if (item.phase !== 'doing') {
            throw new Error('Progress updates can only be added when dream is in Doing phase');
        }
        const validation = safeValidate(progressSchema, entry);
        if (!validation.success) {
            throw new Error(`Validation failed: ${validation.error}`);
        }
        const newEntry = cleanForFirestore({ ...entry, id: generateId() });
        await ItemService.addProgress(itemId, newEntry as ProgressEntry);
        set((state) => {
            const current = state.itemMap[itemId];
            if (!current) return state;
            const mergedItem = { ...current, progress: [...(current.progress || []), newEntry as ProgressEntry] };
            const updatedItems = state.items.map((i) => (i.id === itemId ? mergedItem : i));
            return {
                items: updatedItems,
                filteredItems: applySearchFilter(updatedItems, state.searchQuery),
                itemMap: { ...state.itemMap, [itemId]: mergedItem },
            };
        });
    },

    addExpense: async (itemId, expense) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        if (item.phase !== 'doing') {
            throw new Error('Expenses can only be added when dream is in Doing phase');
        }
        const validation = safeValidate(expenseSchema, expense);
        if (!validation.success) {
            throw new Error(`Validation failed: ${validation.error}`);
        }
        const newExp = cleanForFirestore({ ...expense, id: generateId() });
        await ItemService.addExpense(itemId, newExp as Expense);
        set((state) => {
            const current = state.itemMap[itemId];
            if (!current) return state;
            const mergedItem = { ...current, expenses: [...(current.expenses || []), newExp as Expense] };
            const updatedItems = state.items.map((i) => (i.id === itemId ? mergedItem : i));
            return {
                items: updatedItems,
                filteredItems: applySearchFilter(updatedItems, state.searchQuery),
                itemMap: { ...state.itemMap, [itemId]: mergedItem },
            };
        });
    },

    subscribeToItem: (itemId, onUpdate) => {
        const { activeSubscriptions } = get();

        // Prevent duplicate subscriptions
        if (activeSubscriptions[itemId]) {
            return;
        }

        const unsubscribe = ItemService.subscribeToItem(itemId, (item) => {
            if (item) {
                // Update store's itemMap and items array
                set(state => {
                    const updatedItemMap = { ...state.itemMap, [itemId]: item };
                    const itemExists = state.items.some(i => i.id === itemId);
                    const updatedItems = itemExists
                        ? state.items.map(i => i.id === itemId ? item : i)
                        : [...state.items, item];

                    return {
                        itemMap: updatedItemMap,
                        items: updatedItems,
                        filteredItems: applySearchFilter(updatedItems, state.searchQuery)
                    };
                });

                // Notify screen-level state
                onUpdate(item);
            }
        });

        set(state => ({
            activeSubscriptions: {
                ...state.activeSubscriptions,
                [itemId]: unsubscribe
            }
        }));
    },

    unsubscribeFromItem: (itemId) => {
        const { activeSubscriptions } = get();
        const unsubscribe = activeSubscriptions[itemId];

        if (unsubscribe) {
            unsubscribe();

            set(state => {
                const newSubs = { ...state.activeSubscriptions };
                delete newSubs[itemId];
                return { activeSubscriptions: newSubs };
            });
        }
    },

    clearSubscriptions: () => {
        const { activeSubscriptions } = get();

        Object.values(activeSubscriptions).forEach(unsubscribe => {
            unsubscribe();
        });

        set({ activeSubscriptions: {} });
    }
}));

