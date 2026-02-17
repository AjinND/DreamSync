/**
 * Community Store for DreamSync
 * Manages public dreams feed and interactions
 */

import { create } from 'zustand';
import { auth } from '../../firebaseConfig';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { CommunityService } from '../services/community';
import { BucketItem, Category } from '../types/item';
import { getUserMessage } from '../utils/AppError';
import { shuffleFeed } from '../utils/feedShuffle';
import { createCooldownLimiter } from '../utils/rateLimiter';

interface CommunityState {
    publicDreams: BucketItem[];
    shuffledDreams: BucketItem[]; // Shuffled feed with own-post deprioritization
    allPublicDreams: BucketItem[]; // Unfiltered cache for client-side filtering
    isLoading: boolean;
    error: string | null;
    selectedTag: string | null;
    selectedCategory: Category | null;
    lastFetchTime: number | null; // Timestamp of last fetch for cache validation
    hasMore: boolean;
    isFetchingMore: boolean;
    cursor: QueryDocumentSnapshot<DocumentData> | null;

    // Actions
    fetchPublicDreams: () => Promise<void>;
    fetchMore: () => Promise<void>;
    filterByTag: (tag: string | null) => Promise<void>;
    filterByCategory: (category: Category | null) => Promise<void>;
    toggleLike: (dreamId: string) => Promise<void>;
    refreshFeed: (force?: boolean) => Promise<void>;
    invalidateCache: () => void; // Manually clear cache
    updateDreamMetadata: (dreamId: string, updates: Partial<BucketItem>) => void; // Update specific dream fields
    removeDream: (dreamId: string) => void; // Remove dream from community feed
    upsertDream: (dream: BucketItem) => void; // Add or update dream in feed
    reshuffleFeed: () => void; // Manually reshuffle the feed
}

// Cache duration: 30 seconds
// This ensures fresh data for comments/likes while preventing rapid re-fetches
const CACHE_DURATION = 30 * 1000;
const likeLimiter = createCooldownLimiter(500);
const refreshLimiter = createCooldownLimiter(5000);

/**
 * Helper to apply shuffle to dreams
 */
const applyShuffleToState = (dreams: BucketItem[]) => {
    const currentUserId = auth.currentUser?.uid || null;
    const shuffled = shuffleFeed(dreams, currentUserId);
    return { publicDreams: dreams, shuffledDreams: shuffled };
};

export const useCommunityStore = create<CommunityState>((set, get) => ({
    publicDreams: [],
    shuffledDreams: [],
    allPublicDreams: [],
    isLoading: false,
    error: null,
    selectedTag: null,
    selectedCategory: null,
    lastFetchTime: null,
    hasMore: true,
    isFetchingMore: false,
    cursor: null,

    fetchPublicDreams: async () => {
        __DEV__ && console.log('[CommunityStore] Starting fetchPublicDreams...');
        set({ isLoading: true, error: null });
        try {
            const result = await CommunityService.getPublicDreamsPaginated(20, null);
            const dreams = result.dreams;
            __DEV__ && console.log(`[CommunityStore] Fetched ${dreams.length} public dreams`);
            const { publicDreams, shuffledDreams } = applyShuffleToState(dreams);
            set({
                publicDreams,
                shuffledDreams,
                allPublicDreams: dreams,
                isLoading: false,
                lastFetchTime: Date.now(),
                cursor: result.lastDoc,
                hasMore: result.hasMore,
            });
        } catch (e: any) {
            console.error('[CommunityStore] Error:', e.message);
            set({
                error: getUserMessage(e),
                isLoading: false,
                publicDreams: [],
                shuffledDreams: [],
                allPublicDreams: [],
                cursor: null,
                hasMore: false,
            });
        }
    },

    fetchMore: async () => {
        const { isLoading, isFetchingMore, hasMore, cursor, selectedTag, selectedCategory, publicDreams } = get();
        if (isLoading || isFetchingMore || !hasMore) return;

        set({ isFetchingMore: true, error: null });
        try {
            const result = selectedTag
                ? await CommunityService.getDreamsByTagPaginated(selectedTag, 20, cursor)
                : selectedCategory
                    ? await CommunityService.getDreamsByCategoryPaginated(selectedCategory, 20, cursor)
                    : await CommunityService.getPublicDreamsPaginated(20, cursor);

            const deduped = result.dreams.filter(d => !publicDreams.some(existing => existing.id === d.id));
            const merged = [...publicDreams, ...deduped];
            const { publicDreams: updatedPublic, shuffledDreams } = applyShuffleToState(merged);

            set({
                publicDreams: updatedPublic,
                shuffledDreams,
                allPublicDreams: selectedTag || selectedCategory ? get().allPublicDreams : updatedPublic,
                cursor: result.lastDoc,
                hasMore: result.hasMore,
                isFetchingMore: false,
            });
        } catch (e: any) {
            set({ isFetchingMore: false, error: getUserMessage(e) });
        }
    },

    filterByTag: async (tag: string | null) => {
        const { allPublicDreams, lastFetchTime } = get();
        const isCacheFresh = lastFetchTime && (Date.now() - lastFetchTime) < CACHE_DURATION;

        set({ selectedTag: tag, selectedCategory: null });

        // Client-side filter when cache is fresh
        if (isCacheFresh && allPublicDreams.length > 0) {
            __DEV__ && console.log('[CommunityStore] Using cached data for tag filter');
            const filtered = tag
                ? allPublicDreams.filter(d => d.tags?.includes(tag))
                : allPublicDreams;
            const { publicDreams, shuffledDreams } = applyShuffleToState(filtered);
            set({ publicDreams, shuffledDreams, cursor: null, hasMore: false });
            return;
        }

        // Fallback to API when cache is stale
        set({ isLoading: true, error: null });
        try {
            const result = tag
                ? await CommunityService.getDreamsByTagPaginated(tag, 20, null)
                : await CommunityService.getPublicDreamsPaginated(20, null);
            const dreams = result.dreams;
            const { publicDreams, shuffledDreams } = applyShuffleToState(dreams);
            set({
                publicDreams,
                shuffledDreams,
                allPublicDreams: tag ? allPublicDreams : dreams,
                isLoading: false,
                lastFetchTime: Date.now(),
                cursor: result.lastDoc,
                hasMore: result.hasMore,
            });
        } catch (e: any) {
            set({ error: getUserMessage(e), isLoading: false });
        }
    },

    filterByCategory: async (category: Category | null) => {
        const { allPublicDreams, lastFetchTime } = get();
        const isCacheFresh = lastFetchTime && (Date.now() - lastFetchTime) < CACHE_DURATION;

        set({ selectedCategory: category, selectedTag: null });

        // Client-side filter when cache is fresh
        if (isCacheFresh && allPublicDreams.length > 0) {
            __DEV__ && console.log('[CommunityStore] Using cached data for category filter');
            const filtered = category
                ? allPublicDreams.filter(d => d.category === category)
                : allPublicDreams;
            const { publicDreams, shuffledDreams } = applyShuffleToState(filtered);
            set({ publicDreams, shuffledDreams, cursor: null, hasMore: false });
            return;
        }

        // Fallback to API when cache is stale
        set({ isLoading: true, error: null });
        try {
            const result = category
                ? await CommunityService.getDreamsByCategoryPaginated(category, 20, null)
                : await CommunityService.getPublicDreamsPaginated(20, null);
            const dreams = result.dreams;
            const { publicDreams, shuffledDreams } = applyShuffleToState(dreams);
            set({
                publicDreams,
                shuffledDreams,
                allPublicDreams: category ? allPublicDreams : dreams,
                isLoading: false,
                lastFetchTime: Date.now(),
                cursor: result.lastDoc,
                hasMore: result.hasMore,
            });
        } catch (e: any) {
            set({ error: getUserMessage(e), isLoading: false });
        }
    },

    toggleLike: async (dreamId: string) => {
        if (!likeLimiter.allow(dreamId)) return;
        const prevState = get();
        const { publicDreams, shuffledDreams, allPublicDreams } = prevState;
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
        const currentLikesCount = dream.likesCount ?? currentLikes.length;

        const updatedDream = {
            ...dream,
            likes: nextLikes,
            likesCount: Math.max(0, currentLikesCount + (isCurrentlyLiked ? -1 : 1)),
            userLiked: !isCurrentlyLiked as any,
        } as BucketItem;

        // Update in both arrays
        const updatedPublicDreams = [...publicDreams];
        updatedPublicDreams[dreamIndex] = updatedDream;

        const updatedShuffledDreams = shuffledDreams.map(d =>
            d.id === dreamId ? updatedDream : d
        );

        const updatedAllPublicDreams = allPublicDreams.map(d =>
            d.id === dreamId ? updatedDream : d
        );

        set({
            publicDreams: updatedPublicDreams,
            shuffledDreams: updatedShuffledDreams,
            allPublicDreams: updatedAllPublicDreams,
        });

        try {
            await CommunityService.toggleLike(dreamId, isCurrentlyLiked);
            // ✅ No refresh needed - optimistic update is accurate
            __DEV__ && console.log('[CommunityStore] Like synced to server');
        } catch (e: any) {
            // Revert on error
            console.error('[CommunityStore] Like failed, reverting:', e.message);
            set({
                publicDreams: prevState.publicDreams,
                shuffledDreams: prevState.shuffledDreams,
                allPublicDreams: prevState.allPublicDreams,
                error: getUserMessage(e),
            });
        }
    },

    refreshFeed: async (force = false) => {
        const { selectedTag, selectedCategory, lastFetchTime, publicDreams } = get();
        if (!force && !refreshLimiter.allow('community_refresh')) return;

        // Stale-While-Revalidate Strategy:
        // 1. If we have cached data, use it immediately (no loading state)
        // 2. Then fetch fresh data in background
        // 3. Update UI when fresh data arrives

        const hasCachedData = publicDreams.length > 0;
        const timeSinceLastFetch = lastFetchTime ? Date.now() - lastFetchTime : Infinity;
        const isCacheStale = timeSinceLastFetch >= CACHE_DURATION;

        // If forced or no cached data, show loading and fetch
        if (force || !hasCachedData) {
            __DEV__ && console.log('[CommunityStore] Force refresh or no cache, fetching with loading...');
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
            __DEV__ && console.log(
                `[CommunityStore] Using cached data (${Math.round(timeSinceLastFetch / 1000)}s old)`
            );
            return;
        }

        // Cache is stale but exists: show cached data, fetch in background
        __DEV__ && console.log('[CommunityStore] Cache stale, background refresh...');

        // Fetch fresh data WITHOUT setting isLoading (background refresh)
        try {
            const result = selectedTag
                ? await CommunityService.getDreamsByTagPaginated(selectedTag, 20, null)
                : selectedCategory
                    ? await CommunityService.getDreamsByCategoryPaginated(selectedCategory, 20, null)
                    : await CommunityService.getPublicDreamsPaginated(20, null);
            const dreams = result.dreams;

            __DEV__ && console.log(`[CommunityStore] Background refresh complete: ${dreams.length} dreams`);
            const { publicDreams, shuffledDreams } = applyShuffleToState(dreams);
            set({
                publicDreams,
                shuffledDreams,
                lastFetchTime: Date.now(),
                cursor: result.lastDoc,
                hasMore: result.hasMore,
            });
        } catch (e: any) {
            console.error('[CommunityStore] Background refresh failed:', e.message);
            // Keep showing cached data on error
        }
    },

    invalidateCache: () => {
        __DEV__ && console.log('[CommunityStore] Cache invalidated');
        set({ lastFetchTime: null });
    },

    updateDreamMetadata: (dreamId: string, updates: Partial<BucketItem>) => {
        const { publicDreams, shuffledDreams } = get();
        const dreamIndex = publicDreams.findIndex(d => d.id === dreamId);

        if (dreamIndex !== -1) {
            const updatedPublicDreams = [...publicDreams];
            updatedPublicDreams[dreamIndex] = { ...updatedPublicDreams[dreamIndex], ...updates };

            const updatedShuffledDreams = shuffledDreams.map(d =>
                d.id === dreamId ? { ...d, ...updates } : d
            );

            set({ publicDreams: updatedPublicDreams, shuffledDreams: updatedShuffledDreams });
            __DEV__ && console.log(`[CommunityStore] Updated dream ${dreamId} metadata:`, updates);
        }
    },

    removeDream: (dreamId: string) => {
        const { publicDreams, shuffledDreams, allPublicDreams } = get();
        const filteredPublicDreams = publicDreams.filter(d => d.id !== dreamId);
        const filteredShuffledDreams = shuffledDreams.filter(d => d.id !== dreamId);
        const filteredAllPublicDreams = allPublicDreams.filter(d => d.id !== dreamId);
        set({
            publicDreams: filteredPublicDreams,
            shuffledDreams: filteredShuffledDreams,
            allPublicDreams: filteredAllPublicDreams,
        });
        __DEV__ && console.log(`[CommunityStore] Removed dream ${dreamId} from community feed`);
    },

    upsertDream: (dream: BucketItem) => {
        const { publicDreams, allPublicDreams } = get();
        const dreamIndex = publicDreams.findIndex(d => d.id === dream.id);

        let updatedPublicDreams;
        if (dreamIndex !== -1) {
            updatedPublicDreams = [...publicDreams];
            updatedPublicDreams[dreamIndex] = { ...updatedPublicDreams[dreamIndex], ...dream };
        } else {
            updatedPublicDreams = [dream, ...publicDreams].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }

        // Re-shuffle after upsert
        const { shuffledDreams } = applyShuffleToState(updatedPublicDreams);
        const allIndex = allPublicDreams.findIndex(d => d.id === dream.id);
        const updatedAll = allIndex >= 0
            ? allPublicDreams.map(d => (d.id === dream.id ? { ...d, ...dream } : d))
            : [dream, ...allPublicDreams];
        set({ publicDreams: updatedPublicDreams, shuffledDreams, allPublicDreams: updatedAll });
        __DEV__ && console.log(`[CommunityStore] Upserted dream ${dream.id} in community feed`);
    },

    reshuffleFeed: () => {
        const { publicDreams } = get();
        const { shuffledDreams } = applyShuffleToState(publicDreams);
        set({ shuffledDreams });
        __DEV__ && console.log('[CommunityStore] Feed reshuffled manually');
    },
}));
