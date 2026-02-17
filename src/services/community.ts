/**
 * Community Service for DreamSync
 * Handles public dream feed, likes, and tag filtering
 */

import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    DocumentData,
    doc,
    getDoc,
    getDocs,
    increment,
    limit,
    orderBy,
    Query,
    QueryDocumentSnapshot,
    query,
    serverTimestamp,
    setDoc,
    startAfter,
    updateDoc,
    where,
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { BucketItem } from '../types/item';
import { AppError, ErrorCode, toAppError } from '../utils/AppError';
import { isEncryptedField } from './encryption';
import { UsersService } from './users';

const COLLECTION_NAME = 'items';
const PRIVATE_COLLECTION = 'private';
const PRIVATE_SETTINGS_DOC = 'settings';
const BLOCKED_USERS_CACHE_TTL_MS = 5 * 60 * 1000;

let blockedUsersCache: {
    userId: string;
    users: string[];
    expiresAt: number;
} | null = null;

const invalidateBlockedUsersCache = (userId?: string) => {
    if (!blockedUsersCache) return;
    if (!userId || blockedUsersCache.userId === userId) {
        blockedUsersCache = null;
    }
};

/**
 * Enriches dreams with sharedBy metadata if missing (for legacy posts)
 */
const enrichWithUserData = async (dreams: BucketItem[]): Promise<BucketItem[]> => {
    const dreamsNeedingEnrichment = dreams.filter(d => !d.sharedBy);

    if (dreamsNeedingEnrichment.length === 0) {
        return dreams;
    }

    // Fetch user profiles for dreams missing sharedBy
    const userIds = [...new Set(dreamsNeedingEnrichment.map(d => d.userId))];
    const userProfiles = await Promise.all(
        userIds.map(uid => UsersService.getUserProfile(uid).catch(() => null))
    );

    const userMap = new Map(
        userProfiles
            .filter((p): p is NonNullable<typeof p> => p !== null)
            .map(p => [p.id, p])
    );

    // Enrich dreams with user data
    return dreams.map(dream => {
        if (dream.sharedBy) return dream;

        const user = userMap.get(dream.userId);
        return {
            ...dream,
            sharedBy: {
                userId: dream.userId,
                displayName: user?.displayName || 'Anonymous',
                photoURL: user?.avatar,
            }
        };
    });
};

const sanitizeForPublicView = (dream: BucketItem): BucketItem => {
    const sanitized: BucketItem = { ...dream };

    // Never expose owner/collaborator-only fields in community payload.
    delete (sanitized as any).progress;
    delete (sanitized as any).expenses;

    if (isEncryptedField((sanitized as any).location)) sanitized.location = '';
    if (isEncryptedField((sanitized as any).budget)) sanitized.budget = 0;

    if (Array.isArray(sanitized.memories)) {
        sanitized.memories = sanitized.memories
            .map((m: any) => ({
                ...m,
                caption: isEncryptedField(m?.caption) ? '' : m?.caption,
                imageUrl: isEncryptedField(m?.imageUrl) ? '' : m?.imageUrl,
            }))
            .filter((m: any) => typeof m?.imageUrl === 'string' && m.imageUrl.trim().length > 0);
    }

    if (Array.isArray(sanitized.reflections)) {
        sanitized.reflections = sanitized.reflections.map((r: any) => ({
            ...r,
            answer: isEncryptedField(r?.answer) ? '' : r?.answer,
            contentBlocks: Array.isArray(r?.contentBlocks)
                ? r.contentBlocks.map((block: any) => ({
                    ...block,
                    value: isEncryptedField(block?.value) ? '' : block?.value,
                    caption: isEncryptedField(block?.caption) ? '' : block?.caption,
                }))
                : r?.contentBlocks,
        }));
    }

    if (Array.isArray(sanitized.inspirations)) {
        sanitized.inspirations = sanitized.inspirations.map((i: any) => ({
            ...i,
            content: isEncryptedField(i?.content) ? '' : i?.content,
            caption: isEncryptedField(i?.caption) ? '' : i?.caption,
        }));
    }

    return sanitized;
};

const fetchPagedDreams = async (
    baseQuery: Query<DocumentData>,
    currentUserId: string,
    blockedUsers: string[],
    pageSize: number,
    cursor?: QueryDocumentSnapshot<DocumentData> | null,
): Promise<{
    dreams: BucketItem[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
}> => {
    const fetchLimit = pageSize + 10;
    let localCursor = cursor || null;
    let hasMore = true;
    let rounds = 0;
    let dreams: BucketItem[] = [];

    while (dreams.length < pageSize && hasMore && rounds < 4) {
        const pagedQuery = localCursor
            ? query(baseQuery, startAfter(localCursor), limit(fetchLimit))
            : query(baseQuery, limit(fetchLimit));
        const snapshot = await getDocs(pagedQuery);

        if (snapshot.empty) {
            hasMore = false;
            break;
        }

        localCursor = snapshot.docs[snapshot.docs.length - 1];
        hasMore = snapshot.size >= fetchLimit;

        const chunk = snapshot.docs
            .map(doc => sanitizeForPublicView({ id: doc.id, ...doc.data() } as BucketItem))
            .filter(dream => dream.userId !== currentUserId && !blockedUsers.includes(dream.userId));

        dreams = [...dreams, ...chunk].slice(0, pageSize);
        rounds += 1;
    }

    dreams = await enrichWithUserData(dreams);

    return {
        dreams,
        lastDoc: localCursor,
        hasMore,
    };
};

const annotateLikeState = async (dreams: BucketItem[], userId: string): Promise<BucketItem[]> => {
    await Promise.all(
        dreams.map(async (dream) => {
            try {
                const likeDoc = await getDoc(doc(db, COLLECTION_NAME, dream.id, 'likes', userId));
                (dream as any).userLiked = likeDoc.exists() || (dream.likes || []).includes(userId);
            } catch {
                (dream as any).userLiked = (dream.likes || []).includes(userId);
            }
            if (typeof dream.likesCount !== 'number') {
                dream.likesCount = Array.isArray(dream.likes) ? dream.likes.length : 0;
            }
        })
    );
    return dreams;
};

export const CommunityService = {
    /**
     * Get public dreams for the community feed
     * Note: Queries public items where isPublic === true
     * Excludes the current user's own dreams and blocked users
     */
    async getPublicDreams(maxItems: number = 20): Promise<BucketItem[]> {
        const result = await this.getPublicDreamsPaginated(maxItems, null);
        return result.dreams;
    },

    async getPublicDreamsPaginated(
        maxItems: number = 20,
        cursor: QueryDocumentSnapshot<DocumentData> | null = null
    ): Promise<{
        dreams: BucketItem[];
        lastDoc: QueryDocumentSnapshot<DocumentData> | null;
        hasMore: boolean;
    }> {
        __DEV__ && console.log('[CommunityService] Fetching paginated public dreams...');

        const currentUser = auth.currentUser;
        if (!currentUser) return { dreams: [], lastDoc: null, hasMore: false };

        try {
            const blockedUsers = await this.getBlockedUsers();
            const q = query(
                collection(db, COLLECTION_NAME),
                where('isPublic', '==', true),
                where('phase', 'in', ['doing', 'done']),
                orderBy('createdAt', 'desc')
            );
            const page = await fetchPagedDreams(q, currentUser.uid, blockedUsers, maxItems, cursor);
            page.dreams = await annotateLikeState(page.dreams, currentUser.uid);
            return page;
        } catch (error: any) {
            throw toAppError(error, {
                code: ErrorCode.NETWORK_ERROR,
                userMessage: 'Failed to load community dreams. Please try again.',
            });
        }
    },

    /**
     * Get public dreams filtered by tag
     * Excludes the current user's own dreams and blocked users
     */
    async getDreamsByTag(tag: string, maxItems: number = 20): Promise<BucketItem[]> {
        const result = await this.getDreamsByTagPaginated(tag, maxItems, null);
        return result.dreams;
    },

    async getDreamsByTagPaginated(
        tag: string,
        maxItems: number = 20,
        cursor: QueryDocumentSnapshot<DocumentData> | null = null
    ): Promise<{
        dreams: BucketItem[];
        lastDoc: QueryDocumentSnapshot<DocumentData> | null;
        hasMore: boolean;
    }> {
        const currentUser = auth.currentUser;
        if (!currentUser) return { dreams: [], lastDoc: null, hasMore: false };

        try {
            const blockedUsers = await this.getBlockedUsers();
            const q = query(
                collection(db, COLLECTION_NAME),
                where('isPublic', '==', true),
                where('phase', 'in', ['doing', 'done']),
                where('tags', 'array-contains', tag),
                orderBy('createdAt', 'desc')
            );
            const page = await fetchPagedDreams(q, currentUser.uid, blockedUsers, maxItems, cursor);
            page.dreams = await annotateLikeState(page.dreams, currentUser.uid);
            return page;
        } catch (error: any) {
            throw toAppError(error, {
                code: ErrorCode.NETWORK_ERROR,
                userMessage: 'Failed to load dreams for this tag. Please try again.',
            });
        }
    },

    /**
     * Get public dreams by category
     * Excludes the current user's own dreams and blocked users
     */
    async getDreamsByCategory(category: string, maxItems: number = 20): Promise<BucketItem[]> {
        const result = await this.getDreamsByCategoryPaginated(category, maxItems, null);
        return result.dreams;
    },

    async getDreamsByCategoryPaginated(
        category: string,
        maxItems: number = 20,
        cursor: QueryDocumentSnapshot<DocumentData> | null = null
    ): Promise<{
        dreams: BucketItem[];
        lastDoc: QueryDocumentSnapshot<DocumentData> | null;
        hasMore: boolean;
    }> {
        const currentUser = auth.currentUser;
        if (!currentUser) return { dreams: [], lastDoc: null, hasMore: false };

        try {
            const blockedUsers = await this.getBlockedUsers();
            const q = query(
                collection(db, COLLECTION_NAME),
                where('isPublic', '==', true),
                where('phase', 'in', ['doing', 'done']),
                where('category', '==', category),
                orderBy('createdAt', 'desc')
            );
            const page = await fetchPagedDreams(q, currentUser.uid, blockedUsers, maxItems, cursor);
            page.dreams = await annotateLikeState(page.dreams, currentUser.uid);
            return page;
        } catch (error: any) {
            throw toAppError(error, {
                code: ErrorCode.NETWORK_ERROR,
                userMessage: 'Failed to load dreams for this category. Please try again.',
            });
        }
    },

    /**
     * Toggle like on a dream (like if not liked, unlike if already liked)
     */
    async toggleLike(dreamId: string, currentlyLiked: boolean): Promise<{ liked: boolean }> {
        const user = auth.currentUser;
        if (!user) {
            throw new AppError(
                'User not authenticated',
                ErrorCode.AUTH_REQUIRED,
                'Please sign in to like dreams.'
            );
        }

        __DEV__ && console.log(`[CommunityService] Toggling like for dream: ${dreamId}`);

        try {
            const docRef = doc(db, COLLECTION_NAME, dreamId);
            const likeRef = doc(db, COLLECTION_NAME, dreamId, 'likes', user.uid);

            if (currentlyLiked) {
                await Promise.allSettled([
                    deleteDoc(likeRef),
                    updateDoc(docRef, {
                        likesCount: increment(-1),
                        likes: arrayRemove(user.uid), // backward compatibility
                    }),
                ]);
                __DEV__ && console.log(`[CommunityService] Unliked dream: ${dreamId}`);
                return { liked: false };
            } else {
                await Promise.all([
                    setDoc(likeRef, { createdAt: Date.now() }, { merge: true }),
                    updateDoc(docRef, {
                        likesCount: increment(1),
                        likes: arrayUnion(user.uid), // backward compatibility
                    }),
                ]);
                __DEV__ && console.log(`[CommunityService] Liked dream: ${dreamId}`);
                return { liked: true };
            }
        } catch (error: any) {
            if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                console.error(`[CommunityService] Permission denied for toggling like on dream: ${dreamId}`);
                throw new AppError(
                    'Permission denied to like dream',
                    ErrorCode.PERMISSION_DENIED,
                    'You do not have permission to like this dream.',
                    error,
                );
            }
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to update like. Please try again.',
            });
        }
    },

    /**
     * Check if current user has liked a dream
     */
    isLikedByUser(dream: BucketItem): boolean {
        const user = auth.currentUser;
        if (!user) return false;
        if (typeof (dream as any).userLiked === 'boolean') return (dream as any).userLiked;
        return (dream.likes || []).includes(user.uid);
    },

    /**
     * Get a single dream by ID (public or owned)
     */
    async getDreamById(dreamId: string): Promise<BucketItem | null> {
        __DEV__ && console.log(`[CommunityService] Fetching dream: ${dreamId}`);
        try {
            const docRef = doc(db, COLLECTION_NAME, dreamId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                __DEV__ && console.log(`[CommunityService] Dream found: ${dreamId}`);
                return sanitizeForPublicView({ id: docSnap.id, ...docSnap.data() } as BucketItem);
            }
            __DEV__ && console.log(`[CommunityService] Dream not found: ${dreamId}`);
            return null;
        } catch (error: any) {
            // Check if it's a permission error
            if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                console.error(`[CommunityService] Permission denied for dream: ${dreamId}`, error);
                throw new AppError(
                    'Permission denied to view dream',
                    ErrorCode.PERMISSION_DENIED,
                    'You do not have permission to view this dream.',
                    error,
                );
            }
            console.error(`[CommunityService] Error fetching dream: ${dreamId}`, error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to open dream. Please try again.',
            });
        }
    },

    /**
     * Submit a report for a post
     */
    async reportPost(dreamId: string, reason: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) {
            throw new AppError(
                'User not authenticated',
                ErrorCode.AUTH_REQUIRED,
                'Please sign in to report posts.'
            );
        }

        __DEV__ && console.log(`[CommunityService] Reporting post: ${dreamId} for ${reason}`);

        try {
            await addDoc(collection(db, 'reports'), {
                dreamId,
                reportedBy: user.uid,
                reason,
                createdAt: serverTimestamp(),
                status: 'pending',
            });
            __DEV__ && console.log(`[CommunityService] Report submitted for dream: ${dreamId}`);
        } catch (error: any) {
            console.error('[CommunityService] Error submitting report:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to submit report. Please try again.',
            });
        }
    },

    /**
     * Block a user
     */
    async blockUser(blockedUserId: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) {
            throw new AppError(
                'User not authenticated',
                ErrorCode.AUTH_REQUIRED,
                'Please sign in to block users.'
            );
        }

        __DEV__ && console.log(`[CommunityService] Blocking user: ${blockedUserId}`);

        try {
            const privateSettingsRef = doc(db, 'users', user.uid, PRIVATE_COLLECTION, PRIVATE_SETTINGS_DOC);
            await setDoc(privateSettingsRef, {
                blockedUsers: arrayUnion(blockedUserId),
            }, { merge: true });
            invalidateBlockedUsersCache(user.uid);
            __DEV__ && console.log(`[CommunityService] Blocked user: ${blockedUserId}`);
        } catch (error: any) {
            console.error('[CommunityService] Error blocking user:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to block user. Please try again.',
            });
        }
    },

    /**
     * Unblock a user
     */
    async unblockUser(blockedUserId: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) {
            throw new AppError(
                'User not authenticated',
                ErrorCode.AUTH_REQUIRED,
                'Please sign in to unblock users.'
            );
        }

        try {
            const privateSettingsRef = doc(db, 'users', user.uid, PRIVATE_COLLECTION, PRIVATE_SETTINGS_DOC);
            await setDoc(privateSettingsRef, {
                blockedUsers: arrayRemove(blockedUserId),
            }, { merge: true });
            invalidateBlockedUsersCache(user.uid);
        } catch (error: any) {
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to unblock user. Please try again.',
            });
        }
    },

    /**
     * Get blocked users for current user
     */
    async getBlockedUsers(): Promise<string[]> {
        const user = auth.currentUser;
        if (!user) return [];

        if (
            blockedUsersCache &&
            blockedUsersCache.userId === user.uid &&
            blockedUsersCache.expiresAt > Date.now()
        ) {
            return blockedUsersCache.users;
        }

        try {
            const privateSettingsRef = doc(db, 'users', user.uid, PRIVATE_COLLECTION, PRIVATE_SETTINGS_DOC);
            const privateSnap = await getDoc(privateSettingsRef);

            if (privateSnap.exists()) {
                const blockedUsers = privateSnap.data()?.blockedUsers || [];
                blockedUsersCache = {
                    userId: user.uid,
                    users: blockedUsers,
                    expiresAt: Date.now() + BLOCKED_USERS_CACHE_TTL_MS,
                };
                return blockedUsers;
            }

            // Backward compatibility: legacy root field
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const blockedUsers = userSnap.data()?.blockedUsers || [];
                blockedUsersCache = {
                    userId: user.uid,
                    users: blockedUsers,
                    expiresAt: Date.now() + BLOCKED_USERS_CACHE_TTL_MS,
                };
                return blockedUsers;
            }
            return [];
        } catch (error: any) {
            console.error('[CommunityService] Error fetching blocked users:', error);
            return [];
        }
    },
};
