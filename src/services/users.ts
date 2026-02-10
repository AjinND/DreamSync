/**
 * Users Service for DreamSync
 * Handles user profiles for community features
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { UserProfile } from '../types/social';

const COLLECTION_NAME = 'users';

export const UsersService = {
    /**
     * Get a user's public profile
     */
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        const docRef = doc(db, COLLECTION_NAME, userId);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            return null;
        }

        return { id: snapshot.id, ...snapshot.data() } as UserProfile;
    },

    /**
     * Ensure user profile exists (create on first login)
     */
    async ensureUserProfile(): Promise<UserProfile> {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const docRef = doc(db, COLLECTION_NAME, user.uid);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as UserProfile;
        }

        // Create new profile
        const newProfile: Omit<UserProfile, 'id' | 'settings'> = {
            displayName: user.displayName || user.email?.split('@')[0] || 'Dreamer',
            bio: '',
            email: user.email ?? undefined,
            avatar: user.photoURL ?? undefined,
            publicDreamsCount: 0,
            completedDreamsCount: 0,
            createdAt: Date.now(),
        };

        // Firestore doesn't accept undefined, so strip those fields
        const firestoreData = Object.fromEntries(
            Object.entries(newProfile).filter(([, v]) => v !== undefined)
        );

        await setDoc(docRef, firestoreData);
        return { id: user.uid, ...newProfile };
    },

    /**
     * Update current user's profile
     */
    async updateUserProfile(updates: Partial<Pick<UserProfile, 'displayName' | 'avatar' | 'bio'>>): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const docRef = doc(db, COLLECTION_NAME, user.uid);
        await updateDoc(docRef, updates);
    },

    /**
     * Increment public dreams count
     */
    async incrementPublicDreamsCount(delta: number = 1): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, COLLECTION_NAME, user.uid);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const current = snapshot.data().publicDreamsCount || 0;
            await updateDoc(docRef, { publicDreamsCount: Math.max(0, current + delta) });
        }
    },

    /**
     * Increment completed dreams count
     */
    async incrementCompletedDreamsCount(delta: number = 1): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, COLLECTION_NAME, user.uid);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const current = snapshot.data().completedDreamsCount || 0;
            await updateDoc(docRef, { completedDreamsCount: Math.max(0, current + delta) });
        }
    },

    /**
     * Update multiple user stats atomically
     */
    async updateUserStats(updates: {
        publicDreamsCount?: number;
        completedDreamsCount?: number;
    }): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, COLLECTION_NAME, user.uid);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const data = snapshot.data();
            const updateData: any = {};

            if (updates.publicDreamsCount !== undefined) {
                const current = data.publicDreamsCount || 0;
                updateData.publicDreamsCount = Math.max(0, current + updates.publicDreamsCount);
            }

            if (updates.completedDreamsCount !== undefined) {
                const current = data.completedDreamsCount || 0;
                updateData.completedDreamsCount = Math.max(0, current + updates.completedDreamsCount);
            }

            if (Object.keys(updateData).length > 0) {
                await updateDoc(docRef, updateData);
            }
        }
    },

    /**
     * Delete user's profile photo
     */
    async deleteProfilePhoto(userId: string): Promise<void> {
        const { StorageService, StoragePaths } = await import('./storage');

        // 1. Delete from Storage
        const path = StoragePaths.profileAvatar(userId);
        await StorageService.deleteImage(path);

        // 2. Update Firestore
        const docRef = doc(db, COLLECTION_NAME, userId);
        await updateDoc(docRef, { avatar: null });
    },

    /**
     * Get a user's public dreams
     */
    async getUserPublicDreams(userId: string): Promise<any[]> {
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        const itemsRef = collection(db, 'items');
        // Avoid composite index by not using orderBy - sort client-side
        const q = query(
            itemsRef,
            where('userId', '==', userId),
            where('isPublic', '==', true)
        );

        const snapshot = await getDocs(q);
        const dreams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        // Sort client-side by createdAt descending
        dreams.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

        return dreams;
    },
};
