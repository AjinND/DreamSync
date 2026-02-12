/**
 * Community Service for DreamSync
 * Handles public dream feed, likes, and tag filtering
 */

import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { BucketItem } from '../types/item';
import { isEncryptedField } from './encryption';

const COLLECTION_NAME = 'items';

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
     */
    async getPublicDreams(maxItems: number = 20): Promise<BucketItem[]> {
        console.log('[CommunityService] Fetching public dreams...');

        try {
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
     */
    async getDreamsByTag(tag: string, maxItems: number = 20): Promise<BucketItem[]> {
        console.log(`[CommunityService] Fetching dreams by tag: ${tag}`);

        try {
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

            const dreams = snapshot.docs.map(doc => sanitizeForPublicView({ id: doc.id, ...doc.data() } as BucketItem));
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
     */
    async getDreamsByCategory(category: string, maxItems: number = 20): Promise<BucketItem[]> {
        console.log(`[CommunityService] Fetching dreams by category: ${category}`);

        try {
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

            const dreams = snapshot.docs.map(doc => sanitizeForPublicView({ id: doc.id, ...doc.data() } as BucketItem));
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
};
