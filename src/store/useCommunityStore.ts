/**
 * Community Store for DreamSync
 * Manages public dreams feed and interactions
 */

import { create } from 'zustand';
import { auth } from '../../firebaseConfig';
import { CommunityService } from '../services/community';
import { BucketItem, Category } from '../types/item';

interface CommunityState {
    publicDreams: BucketItem[];
    isLoading: boolean;
    error: string | null;
    selectedTag: string | null;
    selectedCategory: Category | null;
    lastFetchTime: number | null; // Timestamp of last fetch for cache validation

    // Actions
    fetchPublicDreams: () => Promise<void>;
    filterByTag: (tag: string | null) => Promise<void>;
    filterByCategory: (category: Category | null) => Promise<void>;
    toggleLike: (dreamId: string) => Promise<void>;
    refreshFeed: (force?: boolean) => Promise<void>;
    invalidateCache: () => void; // Manually clear cache
    updateDreamMetadata: (dreamId: string, updates: Partial<BucketItem>) => void; // Update specific dream fields
    removeDream: (dreamId: string) => void; // Remove dream from community feed
    upsertDream: (dream: BucketItem) => void; // Add or update dream in feed
}

// Cache duration: 30 seconds
// This ensures fresh data for comments/likes while preventing rapid re-fetches
const CACHE_DURATION = 30 * 1000;

export const useCommunityStore = create<CommunityState>((set, get) => ({
    publicDreams: [],
    isLoading: false,
    error: null,
    selectedTag: null,
    selectedCategory: null,
    lastFetchTime: null,

    fetchPublicDreams: async () => {
        console.log('[CommunityStore] Starting fetchPublicDreams...');
        set({ isLoading: true, error: null });
        try {
            const dreams = await CommunityService.getPublicDreams();
            console.log(`[CommunityStore] Fetched ${dreams.length} public dreams`);
            set({ publicDreams: dreams, isLoading: false, lastFetchTime: Date.now() });
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
            set({ publicDreams: dreams, isLoading: false, lastFetchTime: Date.now() });
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
            set({ publicDreams: dreams, isLoading: false, lastFetchTime: Date.now() });
        } catch (e: any) {
            set({ error: e.message, isLoading: false });
        }
    },

    toggleLike: async (dreamId: string) => {
        const { publicDreams } = get();
        const dreamIndex = publicDreams.findIndex(d => d.id === dreamId);
        if (dreamIndex === -1) return;

        const dream = publicDreams[dreamIndex];
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        // Optimistic update based on likes array (source of truth)
        const isCurrentlyLiked = CommunityService.isLikedByUser(dream);
        const currentLikes = dream.likes || [];
        const nextLikes = isCurrentlyLiked
            ? currentLikes.filter(id => id !== userId)
            : [...currentLikes, userId];

        const updatedDream = {
            ...dream,
            likes: nextLikes,
            likesCount: nextLikes.length,
        };

        const updatedDreams = [...publicDreams];
        updatedDreams[dreamIndex] = updatedDream;
        set({ publicDreams: updatedDreams });

        try {
            await CommunityService.toggleLike(dreamId);
            // ✅ No refresh needed - optimistic update is accurate
            console.log('[CommunityStore] Like synced to server');
        } catch (e: any) {
            // Revert on error
            console.error('[CommunityStore] Like failed, reverting:', e.message);
            set({ publicDreams, error: e.message });
        }
    },

    refreshFeed: async (force = false) => {
        const { selectedTag, selectedCategory, lastFetchTime, publicDreams } = get();

        // Stale-While-Revalidate Strategy:
        // 1. If we have cached data, use it immediately (no loading state)
        // 2. Then fetch fresh data in background
        // 3. Update UI when fresh data arrives

        const hasCachedData = publicDreams.length > 0;
        const timeSinceLastFetch = lastFetchTime ? Date.now() - lastFetchTime : Infinity;
        const isCacheStale = timeSinceLastFetch >= CACHE_DURATION;

        // If forced or no cached data, show loading and fetch
        if (force || !hasCachedData) {
            console.log('[CommunityStore] Force refresh or no cache, fetching with loading...');
            if (selectedTag) {
                await get().filterByTag(selectedTag);
            } else if (selectedCategory) {
                await get().filterByCategory(selectedCategory);
            } else {
                await get().fetchPublicDreams();
            }
            return;
        }

        // If cache is fresh, do nothing (use existing data)
        if (!isCacheStale) {
            console.log(
                `[CommunityStore] Using cached data (${Math.round(timeSinceLastFetch / 1000)}s old)`
            );
            return;
        }

        // Cache is stale but exists: show cached data, fetch in background
        console.log('[CommunityStore] Cache stale, background refresh...');

        // Fetch fresh data WITHOUT setting isLoading (background refresh)
        try {
            const dreams = selectedTag
                ? await CommunityService.getDreamsByTag(selectedTag)
                : selectedCategory
                    ? await CommunityService.getDreamsByCategory(selectedCategory)
                    : await CommunityService.getPublicDreams();

            console.log(`[CommunityStore] Background refresh complete: ${dreams.length} dreams`);
            set({ publicDreams: dreams, lastFetchTime: Date.now() });
        } catch (e: any) {
            console.error('[CommunityStore] Background refresh failed:', e.message);
            // Keep showing cached data on error
        }
    },

    invalidateCache: () => {
        console.log('[CommunityStore] Cache invalidated');
        set({ lastFetchTime: null });
    },

    updateDreamMetadata: (dreamId: string, updates: Partial<BucketItem>) => {
        const { publicDreams } = get();
        const dreamIndex = publicDreams.findIndex(d => d.id === dreamId);

        if (dreamIndex !== -1) {
            const updatedDreams = [...publicDreams];
            updatedDreams[dreamIndex] = { ...updatedDreams[dreamIndex], ...updates };
            set({ publicDreams: updatedDreams });
            console.log(`[CommunityStore] Updated dream ${dreamId} metadata:`, updates);
        }
    },

    removeDream: (dreamId: string) => {
        const { publicDreams } = get();
        const filteredDreams = publicDreams.filter(d => d.id !== dreamId);
        set({ publicDreams: filteredDreams });
        console.log(`[CommunityStore] Removed dream ${dreamId} from community feed`);
    },

    upsertDream: (dream: BucketItem) => {
        const { publicDreams } = get();
        const dreamIndex = publicDreams.findIndex(d => d.id === dream.id);

        let updatedDreams;
        if (dreamIndex !== -1) {
            updatedDreams = [...publicDreams];
            updatedDreams[dreamIndex] = { ...updatedDreams[dreamIndex], ...dream };
        } else {
            updatedDreams = [dream, ...publicDreams].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }

        set({ publicDreams: updatedDreams });
        console.log(`[CommunityStore] Upserted dream ${dream.id} in community feed`);
    },
}));
