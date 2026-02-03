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
    increment,
    limit,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { BucketItem } from '../types/item';

const COLLECTION_NAME = 'items';

export const CommunityService = {
    /**
     * Get public dreams for the community feed
     * Note: Queries public items where isPublic === true
     */
    async getPublicDreams(maxItems: number = 20): Promise<BucketItem[]> {
        console.log('[CommunityService] Fetching public dreams...');

        try {
            // Simple query without orderBy to avoid composite index requirement
            // Firestore composite indexes need to be created in console
            const q = query(
                collection(db, COLLECTION_NAME),
                where('isPublic', '==', true),
                limit(maxItems + 10) // Fetch extra to account for client-side filtering
            );

            const snapshot = await getDocs(q);
            console.log(`[CommunityService] Found ${snapshot.size} public dreams`);

            let dreams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BucketItem));

            // Client-side filter: Exclude Journeys (group/open) to separate them from Community Feed
            dreams = dreams.filter(d => d.collaborationType === 'solo' || !d.collaborationType);

            // Sort client-side by createdAt (descending) since we removed orderBy
            dreams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            return dreams;
        } catch (error: any) {
            console.error('[CommunityService] Error fetching public dreams:', error);

            // Check if it's an index error
            if (error.message?.includes('index')) {
                console.error('[CommunityService] Firestore index required. Check console for link to create index.');
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
            const q = query(
                collection(db, COLLECTION_NAME),
                where('isPublic', '==', true),
                where('tags', 'array-contains', tag),
                limit(maxItems)
            );

            const snapshot = await getDocs(q);
            console.log(`[CommunityService] Found ${snapshot.size} dreams with tag ${tag}`);

            const dreams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BucketItem));
            dreams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

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
            const q = query(
                collection(db, COLLECTION_NAME),
                where('isPublic', '==', true),
                where('category', '==', category),
                limit(maxItems)
            );

            const snapshot = await getDocs(q);
            console.log(`[CommunityService] Found ${snapshot.size} dreams in category ${category}`);

            const dreams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BucketItem));
            dreams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            return dreams;
        } catch (error: any) {
            console.error('[CommunityService] Error fetching dreams by category:', error);
            throw error;
        }
    },

    /**
     * Toggle like on a dream (like if not liked, unlike if already liked)
     */
    async toggleLike(dreamId: string): Promise<{ liked: boolean }> {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        console.log(`[CommunityService] Toggling like for dream: ${dreamId}`);

        const docRef = doc(db, COLLECTION_NAME, dreamId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Dream not found');
        }

        const dreamData = docSnap.data() as BucketItem;
        const currentLikes = dreamData.likes || [];
        const isLiked = currentLikes.includes(user.uid);

        if (isLiked) {
            // Unlike: Remove user from likes array
            await updateDoc(docRef, {
                likes: arrayRemove(user.uid),
                likesCount: increment(-1),
            });
            console.log(`[CommunityService] Unliked dream: ${dreamId}`);
            return { liked: false };
        } else {
            // Like: Add user to likes array
            await updateDoc(docRef, {
                likes: arrayUnion(user.uid),
                likesCount: increment(1),
            });
            console.log(`[CommunityService] Liked dream: ${dreamId}`);
            return { liked: true };
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
        const docRef = doc(db, COLLECTION_NAME, dreamId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as BucketItem;
        }
        return null;
    },
};
