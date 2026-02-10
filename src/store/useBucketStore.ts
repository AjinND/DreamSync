import { create } from 'zustand';
import { decryptDreamFields, encryptDreamFields } from '../services/encryption';
import { ItemService } from '../services/items';
import { KeyManager } from '../services/keyManager';
import { BucketItem, Expense, Inspiration, Memory, Phase, ProgressEntry, Reflection } from '../types/item';

interface BucketState {
    items: BucketItem[];
    itemMap: Record<string, BucketItem>;
    loading: boolean;
    error: string | null;
    fetchItems: () => Promise<void>;
    addItem: (item: Omit<BucketItem, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
    updatePhase: (id: string, newPhase: Phase) => Promise<void>;
    updateItem: (id: string, updates: Partial<BucketItem>) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    // Sub-item helpers
    addInspiration: (itemId: string, inspiration: Omit<Inspiration, 'id'>) => Promise<void>;
    deleteInspiration: (itemId: string, inspirationId: string) => Promise<void>;
    addMemory: (itemId: string, memory: Omit<Memory, 'id'>) => Promise<void>;
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

export const useBucketStore = create<BucketState>((set, get) => ({
    items: [],
    itemMap: {},
    loading: false,
    error: null,
    activeSubscriptions: {},

    fetchItems: async () => {
        set({ loading: true, error: null });
        try {
            // 1. Fetch Owned Items
            const ownedItems = await ItemService.getUserItems();

            // 2. Fetch Joined Journeys to find shared items
            const { auth } = await import('../../firebaseConfig'); // Lazy import to avoid cycle if any
            const { JourneysService } = await import('../services/journeys');

            let sharedItems: BucketItem[] = [];
            const userId = auth.currentUser?.uid;

            if (userId) {
                const myJourneys = await JourneysService.getUserJourneys(userId);
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

            set({ items: allItems, itemMap, loading: false });
        } catch (e: any) {
            set({ error: e.message, loading: false });
        }
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
            set({ error: e.message, loading: false });
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

        set({ items: updatedItems, itemMap: updatedItemMap });

        try {
            await ItemService.updateItem(id, { phase });
            if (phase === 'done') {
                await ItemService.updateItem(id, { completedAt: Date.now() });
            }

            // Update completed count if transitioning to done
            if (!wasDone && phase === 'done') {
                const { UsersService } = await import('../services/users');
                await UsersService.incrementCompletedDreamsCount(1);
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
            set({ items: prevItems, itemMap: prevItemMap, error: e.message });
            throw e;
        }
    },

    updateItem: async (id, updates) => {
        try {
            const oldItem = get().itemMap[id];
            const wasPublic = oldItem?.isPublic || false;
            const wasDone = oldItem?.phase === 'done';

            // Handle public/private encryption transitions
            let processedUpdates = { ...updates };
            if ('isPublic' in updates && oldItem) {
                const fieldKey = await KeyManager.getFieldEncryptionKey();
                if (fieldKey) {
                    if (wasPublic && updates.isPublic === false) {
                        // Public -> Private: encrypt the full item's sensitive fields
                        // ItemService.updateItem handles encryption, but we should
                        // pass encryptionVersion to signal encrypted state
                        processedUpdates.encryptionVersion = 1;
                    } else if (!wasPublic && updates.isPublic === true) {
                        // Private -> Public: decrypt all fields, store as plaintext
                        // Re-read the raw item and write back decrypted
                        if (oldItem.encryptionVersion) {
                            const decrypted = decryptDreamFields(oldItem, fieldKey);
                            processedUpdates = {
                                ...processedUpdates,
                                ...decrypted,
                                encryptionVersion: 0, // 0 = not encrypted
                                isPublic: true,
                            };
                            // Remove the id/userId since they aren't update fields
                            delete (processedUpdates as any).id;
                            delete (processedUpdates as any).userId;
                            delete (processedUpdates as any).createdAt;
                        }
                    }
                }
            }

            // Skip encryption in ItemService when the store already handled the transition
            const handledTransition = 'isPublic' in updates && oldItem;
            await ItemService.updateItem(id, processedUpdates, handledTransition ? { skipEncryption: true } : undefined);
            await get().fetchItems();

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
            set({ error: e.message });
            throw e;
        }
    },

    deleteItem: async (id) => {
        try {
            // Capture item before deletion for Storage cleanup AND stats
            const item = get().itemMap[id];

            await ItemService.deleteItem(id);
            set(state => ({
                items: state.items.filter(i => i.id !== id),
                itemMap: Object.fromEntries(
                    Object.entries(state.itemMap).filter(([key]) => key !== id)
                ),
            }));

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
                    StorageService.deleteDreamAssets(userId, id, item).catch(() => {
                        // Silently ignore — best effort
                    });
                }
            }
        } catch (e: any) {
            set({ error: e.message });
            throw e;
        }
    },

    addInspiration: async (itemId, inspiration) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        const newInsp = cleanForFirestore({ ...inspiration, id: generateId() });
        const updated = [...(item.inspirations || []), newInsp];
        await get().updateItem(itemId, { inspirations: updated });
    },

    deleteInspiration: async (itemId, inspirationId) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        const updated = (item.inspirations || []).filter(i => i.id !== inspirationId);
        await get().updateItem(itemId, { inspirations: updated });
    },

    addMemory: async (itemId, memory) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        const newMem = cleanForFirestore({ ...memory, id: generateId() });
        const updated = [...(item.memories || []), newMem];
        await get().updateItem(itemId, { memories: updated });
    },

    addReflection: async (itemId, reflection) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        const newRef = cleanForFirestore({ ...reflection, id: generateId() });
        const updated = [...(item.reflections || []), newRef];
        await get().updateItem(itemId, { reflections: updated });
    },

    addProgress: async (itemId, entry) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        const newEntry = cleanForFirestore({ ...entry, id: generateId() });
        const updated = [...(item.progress || []), newEntry];
        await get().updateItem(itemId, { progress: updated });
    },

    addExpense: async (itemId, expense) => {
        const item = get().itemMap[itemId];
        if (!item) return;
        const newExp = cleanForFirestore({ ...expense, id: generateId() });
        const updated = [...(item.expenses || []), newExp];
        await get().updateItem(itemId, { expenses: updated });
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
                        items: updatedItems
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

