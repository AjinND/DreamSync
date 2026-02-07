import { create } from 'zustand';
import { ItemService } from '../services/items';
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
    addMemory: (itemId: string, memory: Omit<Memory, 'id'>) => Promise<void>;
    addReflection: (itemId: string, reflection: Omit<Reflection, 'id'>) => Promise<void>;
    addProgress: (itemId: string, entry: Omit<ProgressEntry, 'id'>) => Promise<void>;
    addExpense: (itemId: string, expense: Omit<Expense, 'id'>) => Promise<void>;
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
        } catch (e: any) {
            set({ error: e.message, loading: false });
            throw e;
        }
    },

    updatePhase: async (id, phase) => {
        const prevItems = get().items;
        const prevItemMap = get().itemMap;

        // Optimistic update - update BOTH items and itemMap
        const now = Date.now();
        // Optimistic update - update BOTH items and itemMap
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

            // Sync to community store if item is public
            // Use the updated item from our optimistic update
            if (updatedItem?.isPublic) {
                const { useCommunityStore } = await import('./useCommunityStore');

                // If changing to 'dream' phase, remove from community (private planning)
                // Otherwise, upsert into community (handles both add and update)
                if (phase === 'dream') {
                    useCommunityStore.getState().removeDream(id);
                } else {
                    // updatedItem has the new phase and potentially completedAt
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
            await ItemService.updateItem(id, updates);
            await get().fetchItems();

            // Sync to community store if item is public
            const item = get().itemMap[id];
            if (item?.isPublic) {
                const { useCommunityStore } = await import('./useCommunityStore');

                // If updating phase to 'dream', remove from community (private planning)
                // Otherwise, upsert into community (handles both add and update)
                // We use item from ItemMap which is fresh from server after fetchItems()
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
            await ItemService.deleteItem(id);
            set(state => ({ items: state.items.filter(i => i.id !== id) }));
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
}));

