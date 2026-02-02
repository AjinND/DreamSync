import { create } from 'zustand';
import { ItemService } from '../services/items';
import { BucketItem, Phase } from '../types/item';

interface BucketState {
    items: BucketItem[];
    itemMap: Record<string, BucketItem>; // For O(1) by ID lookup
    loading: boolean;
    error: string | null;
    fetchItems: () => Promise<void>;
    addItem: (item: Omit<BucketItem, 'id' | 'createdAt' | 'userId' | 'checklist'>) => Promise<void>;
    updatePhase: (id: string, newPhase: Phase) => Promise<void>;
    updateItem: (id: string, updates: Partial<BucketItem>) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
}

export const useBucketStore = create<BucketState>((set, get) => ({
    items: [],
    itemMap: {},
    loading: false,
    error: null,

    fetchItems: async () => {
        set({ loading: true, error: null });
        try {
            const items = await ItemService.getUserItems();
            const itemMap: Record<string, BucketItem> = {};
            items.forEach(i => itemMap[i.id] = i);
            set({ items, itemMap, loading: false });
        } catch (e: any) {
            set({ error: e.message, loading: false });
        }
    },

    addItem: async (itemData) => {
        console.log("[Store] addItem action triggered");
        set({ loading: true });
        try {
            await ItemService.createItem({ ...itemData, checklist: [] });
            console.log("[Store] Item created via Service, fetching updated list...");
            await get().fetchItems(); // Refresh for now (optimistic updates can be added later)
            console.log("[Store] List refreshed successfully");
        } catch (e: any) {
            console.error("[Store] addItem failed:", e);
            set({ error: e.message, loading: false });
            throw e; // Re-throw so UI knows it failed
        }
    },

    updatePhase: async (id, phase) => {
        // Optimistic Update
        const prevItems = get().items;
        set(state => ({
            items: state.items.map(i => i.id === id ? { ...i, phase } : i)
        }));

        try {
            await ItemService.updateItem(id, { phase });
            // If we wanted to record completedAt when done:
            if (phase === 'done') {
                await ItemService.updateItem(id, { completedAt: Date.now() });
            }
        } catch (e: any) {
            // Revert
            set({ items: prevItems, error: e.message });
            throw e;
        }
    },

    updateItem: async (id, updates) => {
        try {
            await ItemService.updateItem(id, updates);
            await get().fetchItems();
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
    }
}));
