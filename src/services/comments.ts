/**
 * Comments Service - Firebase operations for dream comments
 */

import { auth, db } from '@/firebaseConfig';
import { Comment } from '@/src/types/social';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    orderBy,
    query,
    updateDoc,
} from 'firebase/firestore';

const ITEMS_COLLECTION = 'items';
const USERS_COLLECTION = 'users';

export const CommentsService = {
    /**
     * Add a comment to a dream
     */
    async addComment(dreamId: string, text: string): Promise<Comment | null> {
        const user = auth.currentUser;
        if (!user) {
            console.error('[CommentsService] User not authenticated');
            return null;
        }

        try {
            // Fetch user profile from Firestore for accurate displayName
            const userDocRef = doc(db, USERS_COLLECTION, user.uid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.exists() ? userDoc.data() : null;

            // Build comment object, only include userAvatar if it exists
            const comment: Omit<Comment, 'id'> = {
                userId: user.uid,
                userName: userData?.displayName || user.displayName || 'Anonymous',
                text: text.trim(),
                createdAt: Date.now(),
            };

            // Only add userAvatar if user has one (Firebase doesn't accept undefined)
            const avatarUrl = userData?.avatar || user.photoURL;
            if (avatarUrl) {
                (comment as any).userAvatar = avatarUrl;
            }

            // Add the comment to subcollection
            const commentsRef = collection(db, ITEMS_COLLECTION, dreamId, 'comments');
            const docRef = await addDoc(commentsRef, comment);

            __DEV__ && console.log('[CommentsService] Comment added:', docRef.id);

            // Try to increment comments count (may fail if not owner, that's OK)
            try {
                const dreamRef = doc(db, ITEMS_COLLECTION, dreamId);
                await updateDoc(dreamRef, {
                    commentsCount: increment(1),
                });
            } catch (countError) {
                // Non-owners can't update the dream document, but the comment was still added
                __DEV__ && console.log('[CommentsService] Could not update count (user is not owner)');
            }

            return { id: docRef.id, ...comment };
        } catch (error) {
            console.error('[CommentsService] Failed to add comment:', error);
            return null;
        }
    },

    /**
     * Get all comments for a dream
     */
    async getComments(dreamId: string): Promise<Comment[]> {
        try {
            const commentsRef = collection(db, ITEMS_COLLECTION, dreamId, 'comments');
            const q = query(commentsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            const comments: Comment[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as Comment));

            __DEV__ && console.log(`[CommentsService] Fetched ${comments.length} comments`);
            return comments;
        } catch (error) {
            console.error('[CommentsService] Failed to fetch comments:', error);
            return [];
        }
    },

    /**
     * Delete a comment (only owner can delete)
     */
    async deleteComment(dreamId: string, commentId: string): Promise<boolean> {
        const user = auth.currentUser;
        if (!user) {
            console.error('[CommentsService] User not authenticated');
            return false;
        }

        try {
            const commentRef = doc(db, ITEMS_COLLECTION, dreamId, 'comments', commentId);
            const [commentSnap, dreamSnap] = await Promise.all([
                getDoc(commentRef),
                getDoc(doc(db, ITEMS_COLLECTION, dreamId)),
            ]);

            if (!commentSnap.exists()) {
                console.error('[CommentsService] Comment not found:', commentId);
                return false;
            }

            const commentData = commentSnap.data() as Comment;
            const dreamOwnerId = dreamSnap.exists() ? (dreamSnap.data()?.userId as string | undefined) : undefined;
            const canDelete = commentData.userId === user.uid || dreamOwnerId === user.uid;
            if (!canDelete) {
                console.error('[CommentsService] Unauthorized delete attempt:', commentId);
                return false;
            }

            // Delete the comment after authorization check
            await deleteDoc(commentRef);

            __DEV__ && console.log('[CommentsService] Comment deleted:', commentId);

            // Try to decrement comments count (may fail if not dream owner, that's OK)
            try {
                const dreamRef = doc(db, ITEMS_COLLECTION, dreamId);
                await updateDoc(dreamRef, {
                    commentsCount: increment(-1),
                });
            } catch (countError) {
                // Non-owners can't update the dream document, but the comment was still deleted
                __DEV__ && console.log('[CommentsService] Could not update count (user is not owner)');
            }

            return true;
        } catch (error) {
            console.error('[CommentsService] Failed to delete comment:', error);
            return false;
        }
    },

    /**
     * Sync comment count to match actual number of comments
     * (Self-healing for consistency)
     */
    async syncCommentCount(dreamId: string, actualCount: number): Promise<void> {
        try {
            const dreamRef = doc(db, ITEMS_COLLECTION, dreamId);
            await updateDoc(dreamRef, {
                commentsCount: actualCount,
            });
            __DEV__ && console.log(`[CommentsService] Synced comments count to ${actualCount}`);
        } catch (error) {
            // Silently fail if we can't update (e.g. permission issues)
            __DEV__ && console.log('[CommentsService] Failed to sync count:', error);
        }
    },
};
