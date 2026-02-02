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
            const items = await ItemService.getUserItems();
            const itemMap: Record<string, BucketItem> = {};
            items.forEach(i => itemMap[i.id] = i);
            set({ items, itemMap, loading: false });
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
        set(state => ({
            items: state.items.map(i => i.id === id ? { ...i, phase } : i)
        }));

        try {
            await ItemService.updateItem(id, { phase });
            if (phase === 'done') {
                await ItemService.updateItem(id, { completedAt: Date.now() });
            }
        } catch (e: any) {
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

