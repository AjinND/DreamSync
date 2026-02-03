/**
 * Community Store for DreamSync
 * Manages public dreams feed and interactions
 */

import { create } from 'zustand';
import { CommunityService } from '../services/community';
import { BucketItem, Category } from '../types/item';

interface CommunityState {
    publicDreams: BucketItem[];
    isLoading: boolean;
    error: string | null;
    selectedTag: string | null;
    selectedCategory: Category | null;

    // Actions
    fetchPublicDreams: () => Promise<void>;
    filterByTag: (tag: string | null) => Promise<void>;
    filterByCategory: (category: Category | null) => Promise<void>;
    toggleLike: (dreamId: string) => Promise<void>;
    refreshFeed: () => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
    publicDreams: [],
    isLoading: false,
    error: null,
    selectedTag: null,
    selectedCategory: null,

    fetchPublicDreams: async () => {
        console.log('[CommunityStore] Starting fetchPublicDreams...');
        set({ isLoading: true, error: null });
        try {
            const dreams = await CommunityService.getPublicDreams();
            console.log(`[CommunityStore] Fetched ${dreams.length} public dreams`);
            set({ publicDreams: dreams, isLoading: false });
        } catch (e: any) {
            console.error('[CommunityStore] Error:', e.message);
            set({ error: e.message, isLoading: false, publicDreams: [] });
        }
    },

    filterByTag: async (tag: string | null) => {
        set({ selectedTag: tag, selectedCategory: null, isLoading: true, error: null });
        try {
            const dreams = tag
                ? await CommunityService.getDreamsByTag(tag)
                : await CommunityService.getPublicDreams();
            set({ publicDreams: dreams, isLoading: false });
        } catch (e: any) {
            set({ error: e.message, isLoading: false });
        }
    },

    filterByCategory: async (category: Category | null) => {
        set({ selectedCategory: category, selectedTag: null, isLoading: true, error: null });
        try {
            const dreams = category
                ? await CommunityService.getDreamsByCategory(category)
                : await CommunityService.getPublicDreams();
            set({ publicDreams: dreams, isLoading: false });
        } catch (e: any) {
            set({ error: e.message, isLoading: false });
        }
    },

    toggleLike: async (dreamId: string) => {
        const { publicDreams } = get();
        const dreamIndex = publicDreams.findIndex(d => d.id === dreamId);
        if (dreamIndex === -1) return;

        // Optimistic update
        const dream = publicDreams[dreamIndex];
        const isCurrentlyLiked = CommunityService.isLikedByUser(dream);
        const updatedDream = {
            ...dream,
            likesCount: (dream.likesCount || 0) + (isCurrentlyLiked ? -1 : 1),
        };

        const updatedDreams = [...publicDreams];
        updatedDreams[dreamIndex] = updatedDream;
        set({ publicDreams: updatedDreams });

        try {
            await CommunityService.toggleLike(dreamId);
            // Refresh to get accurate data
            await get().refreshFeed();
        } catch (e: any) {
            // Revert on error
            set({ publicDreams, error: e.message });
        }
    },

    refreshFeed: async () => {
        const { selectedTag, selectedCategory } = get();
        if (selectedTag) {
            await get().filterByTag(selectedTag);
        } else if (selectedCategory) {
            await get().filterByCategory(selectedCategory);
        } else {
            await get().fetchPublicDreams();
        }
    },
}));
