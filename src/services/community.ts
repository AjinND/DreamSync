/**
 * Community Service for DreamSync
 * Handles public dream feed, likes, and tag filtering
 */

import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { BucketItem } from '../types/item';
import { isEncryptedField } from './encryption';
import { UsersService } from './users';

const COLLECTION_NAME = 'items';

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

export const CommunityService = {
    /**
     * Get public dreams for the community feed
     * Note: Queries public items where isPublic === true
     * Excludes the current user's own dreams and blocked users
     */
    async getPublicDreams(maxItems: number = 20): Promise<BucketItem[]> {
        console.log('[CommunityService] Fetching public dreams...');

        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.log('[CommunityService] No authenticated user, returning empty feed');
            return [];
        }

        try {
            // Fetch blocked users first
            const blockedUsers = await this.getBlockedUsers();

            // Note: Requires composite index on (isPublic, phase, createdAt)
            // See firestore.indexes.json for index definitions
            const q = query(
                collection(db, COLLECTION_NAME),
                where('isPublic', '==', true),
                where('phase', 'in', ['doing', 'done']),
                orderBy('createdAt', 'desc'),
                limit(maxItems + 10)
            );

            const snapshot = await getDocs(q);
            console.log(`[CommunityService] Found ${snapshot.size} public dreams`);

            let dreams = snapshot.docs.map(doc => sanitizeForPublicView({ id: doc.id, ...doc.data() } as BucketItem));

            // Filter out current user's dreams and blocked users (client-side)
            dreams = dreams.filter(dream =>
                dream.userId !== currentUser.uid &&
                !blockedUsers.includes(dream.userId)
            );
            console.log(`[CommunityService] After filtering own dreams and blocked users: ${dreams.length} dreams`);

            // Enrich with user data for legacy posts missing sharedBy
            dreams = await enrichWithUserData(dreams);

            // Client-side sort (remove after enabling orderBy above)
            // dreams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            return dreams;
        } catch (error: any) {
            console.error('[CommunityService] Error fetching public dreams:', error);

            // Check if it's an index error
            if (error.message?.includes('index')) {
                console.error('[CommunityService] Firestore index required. Run: firebase deploy --only firestore:indexes');
            }

            throw error;
        }
    },

    /**
     * Get public dreams filtered by tag
     * Excludes the current user's own dreams and blocked users
     */
    async getDreamsByTag(tag: string, maxItems: number = 20): Promise<BucketItem[]> {
        console.log(`[CommunityService] Fetching dreams by tag: ${tag}`);

        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.log('[CommunityService] No authenticated user, returning empty feed');
            return [];
        }

        try {
            // Fetch blocked users first
            const blockedUsers = await this.getBlockedUsers();

            // Note: Requires composite index on (isPublic, phase, tags, createdAt)
            const q = query(
                collection(db, COLLECTION_NAME),
                where('isPublic', '==', true),
                where('phase', 'in', ['doing', 'done']),
                where('tags', 'array-contains', tag),
                orderBy('createdAt', 'desc'),
                limit(maxItems)
            );

            const snapshot = await getDocs(q);
            console.log(`[CommunityService] Found ${snapshot.size} dreams with tag ${tag}`);

            let dreams = snapshot.docs.map(doc => sanitizeForPublicView({ id: doc.id, ...doc.data() } as BucketItem));

            // Filter out current user's dreams and blocked users (client-side)
            dreams = dreams.filter(dream =>
                dream.userId !== currentUser.uid &&
                !blockedUsers.includes(dream.userId)
            );
            console.log(`[CommunityService] After filtering own dreams and blocked users: ${dreams.length} dreams`);

            // Enrich with user data for legacy posts missing sharedBy
            dreams = await enrichWithUserData(dreams);

            // Client-side sort (remove after enabling orderBy above)
            // dreams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            return dreams;
        } catch (error: any) {
            console.error('[CommunityService] Error fetching dreams by tag:', error);
            throw error;
        }
    },

    /**
     * Get public dreams by category
     * Excludes the current user's own dreams and blocked users
     */
    async getDreamsByCategory(category: string, maxItems: number = 20): Promise<BucketItem[]> {
        console.log(`[CommunityService] Fetching dreams by category: ${category}`);

        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.log('[CommunityService] No authenticated user, returning empty feed');
            return [];
        }

        try {
            // Fetch blocked users first
            const blockedUsers = await this.getBlockedUsers();

            // Note: Requires composite index on (isPublic, phase, category, createdAt)
            const q = query(
                collection(db, COLLECTION_NAME),
                where('isPublic', '==', true),
                where('phase', 'in', ['doing', 'done']),
                where('category', '==', category),
                orderBy('createdAt', 'desc'),
                limit(maxItems)
            );

            const snapshot = await getDocs(q);
            console.log(`[CommunityService] Found ${snapshot.size} dreams in category ${category}`);

            let dreams = snapshot.docs.map(doc => sanitizeForPublicView({ id: doc.id, ...doc.data() } as BucketItem));

            // Filter out current user's dreams and blocked users (client-side)
            dreams = dreams.filter(dream =>
                dream.userId !== currentUser.uid &&
                !blockedUsers.includes(dream.userId)
            );
            console.log(`[CommunityService] After filtering own dreams and blocked users: ${dreams.length} dreams`);

            // Enrich with user data for legacy posts missing sharedBy
            dreams = await enrichWithUserData(dreams);

            // Client-side sort (remove after enabling orderBy above)
            // dreams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            return dreams;
        } catch (error: any) {
            console.error('[CommunityService] Error fetching dreams by category:', error);
            throw error;
        }
    },

    /**
     * Toggle like on a dream (like if not liked, unlike if already liked)
     */
    async toggleLike(dreamId: string, currentlyLiked: boolean): Promise<{ liked: boolean }> {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        console.log(`[CommunityService] Toggling like for dream: ${dreamId}`);

        try {
            const docRef = doc(db, COLLECTION_NAME, dreamId);

            if (currentlyLiked) {
                // Unlike: Remove user from likes array (idempotent)
                await updateDoc(docRef, {
                    likes: arrayRemove(user.uid),
                });
                console.log(`[CommunityService] Unliked dream: ${dreamId}`);
                return { liked: false };
            } else {
                // Like: Add user to likes array (idempotent)
                await updateDoc(docRef, {
                    likes: arrayUnion(user.uid),
                });
                console.log(`[CommunityService] Liked dream: ${dreamId}`);
                return { liked: true };
            }
        } catch (error: any) {
            if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                console.error(`[CommunityService] Permission denied for toggling like on dream: ${dreamId}`);
                throw new Error('You do not have permission to like this dream');
            }
            throw error;
        }
    },

    /**
     * Check if current user has liked a dream
     */
    isLikedByUser(dream: BucketItem): boolean {
        const user = auth.currentUser;
        if (!user) return false;
        return (dream.likes || []).includes(user.uid);
    },

    /**
     * Get a single dream by ID (public or owned)
     */
    async getDreamById(dreamId: string): Promise<BucketItem | null> {
        console.log(`[CommunityService] Fetching dream: ${dreamId}`);
        try {
            const docRef = doc(db, COLLECTION_NAME, dreamId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log(`[CommunityService] Dream found: ${dreamId}`);
                return sanitizeForPublicView({ id: docSnap.id, ...docSnap.data() } as BucketItem);
            }
            console.log(`[CommunityService] Dream not found: ${dreamId}`);
            return null;
        } catch (error: any) {
            // Check if it's a permission error
            if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                console.error(`[CommunityService] Permission denied for dream: ${dreamId}`, error);
                throw new Error('You do not have permission to view this dream');
            }
            console.error(`[CommunityService] Error fetching dream: ${dreamId}`, error);
            throw error;
        }
    },

    /**
     * Submit a report for a post
     */
    async reportPost(dreamId: string, reason: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        console.log(`[CommunityService] Reporting post: ${dreamId} for ${reason}`);

        try {
            await addDoc(collection(db, 'reports'), {
                dreamId,
                reportedBy: user.uid,
                reason,
                createdAt: serverTimestamp(),
                status: 'pending',
            });
            console.log(`[CommunityService] Report submitted for dream: ${dreamId}`);
        } catch (error: any) {
            console.error('[CommunityService] Error submitting report:', error);
            throw error;
        }
    },

    /**
     * Block a user
     */
    async blockUser(blockedUserId: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        console.log(`[CommunityService] Blocking user: ${blockedUserId}`);

        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                blockedUsers: arrayUnion(blockedUserId),
            });
            console.log(`[CommunityService] Blocked user: ${blockedUserId}`);
        } catch (error: any) {
            console.error('[CommunityService] Error blocking user:', error);
            throw error;
        }
    },

    /**
     * Get blocked users for current user
     */
    async getBlockedUsers(): Promise<string[]> {
        const user = auth.currentUser;
        if (!user) return [];

        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                return userSnap.data()?.blockedUsers || [];
            }
            return [];
        } catch (error: any) {
            console.error('[CommunityService] Error fetching blocked users:', error);
            return [];
        }
    },
};
