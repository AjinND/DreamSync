/**
 * Users Service for DreamSync
 * Handles user profiles for community features
 */

import {
    doc,
    getDoc,
    increment,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../types/notification';
import { UserProfile } from '../types/social';
import { AppError, ErrorCode, toAppError } from '../utils/AppError';
import { decryptProfileFields, encryptProfileFields, isEncryptedField } from './encryption';
import { KeyManager } from './keyManager';
import { safeValidate, profileUpdateSchema } from './validation';

const COLLECTION_NAME = 'users';
const PRIVATE_COLLECTION = 'private';
const PRIVATE_SETTINGS_DOC = 'settings';

const DEFAULT_USER_SETTINGS = {
    notifications: DEFAULT_NOTIFICATION_PREFERENCES,
    privacy: {
        isPublicProfile: true,
        showCompletedDreams: true,
    },
    theme: 'system' as const,
};

const isPermissionDenied = (error: any) =>
    error?.code === 'permission-denied' || error?.code === 'firestore/permission-denied';

export const UsersService = {
    _getUserRef(userId: string) {
        return doc(db, COLLECTION_NAME, userId);
    },

    _getPrivateSettingsRef(userId: string) {
        return doc(db, COLLECTION_NAME, userId, PRIVATE_COLLECTION, PRIVATE_SETTINGS_DOC);
    },

    _getLegacySettingsRef(userId: string) {
        return doc(db, COLLECTION_NAME, userId);
    },

    _mergeSettings(settings?: any) {
        return {
            ...DEFAULT_USER_SETTINGS,
            ...(settings || {}),
            notifications: {
                ...DEFAULT_USER_SETTINGS.notifications,
                ...(settings?.notifications || {}),
            },
            privacy: {
                ...DEFAULT_USER_SETTINGS.privacy,
                ...(settings?.privacy || {}),
            },
        };
    },

    async getUserSettings(userId: string): Promise<UserProfile['settings'] | undefined> {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId || currentUserId !== userId) return undefined;

        const privateRef = UsersService._getPrivateSettingsRef(userId);
        try {
            const privateSnapshot = await getDoc(privateRef);
            if (privateSnapshot.exists()) {
                const privateData = privateSnapshot.data();
                return UsersService._mergeSettings(privateData.settings);
            }
        } catch (error: any) {
            if (!isPermissionDenied(error)) {
                throw error;
            }
        }

        // Backward compatibility: legacy settings on root user doc.
        const userRef = UsersService._getUserRef(userId);
        const userSnapshot = await getDoc(userRef);
        if (userSnapshot.exists()) {
            const legacySettings = userSnapshot.data()?.settings;
            if (legacySettings) return UsersService._mergeSettings(legacySettings);
        }

        return UsersService._mergeSettings();
    },

    /**
     * Get a user's public profile
     */
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        const docRef = UsersService._getUserRef(userId);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
            return null;
        }

        let profileData = { id: snapshot.id, ...snapshot.data() } as UserProfile;
        const currentUserId = auth.currentUser?.uid;
        const isOwner = currentUserId === userId;

        // Respect public-profile privacy for non-owners.
        if (!isOwner && profileData.settings?.privacy?.isPublicProfile === false) {
            return null;
        }

        if (isOwner) {
            profileData.settings = await UsersService.getUserSettings(userId);
        }

        // Only decrypt if this is the current user's own profile
        // Other users' profiles are encrypted with THEIR key, not ours
        // NOTE: Only email is encrypted now, bio is public plaintext
        if (isOwner) {
            const fieldKey = await KeyManager.getFieldEncryptionKey();
            if (fieldKey && isEncryptedField(profileData.email)) {
                profileData = decryptProfileFields(profileData, fieldKey) as UserProfile;
            }
        } else {
            // Never expose email outside the owner context.
            delete (profileData as any).email;
        }

        return profileData;
    },

    /**
     * Ensure user profile exists (create on first login)
     */
    async ensureUserProfile(): Promise<UserProfile> {
        const user = auth.currentUser;
        if (!user) {
            throw new AppError('User not authenticated', ErrorCode.AUTH_REQUIRED, 'Please sign in to continue.');
        }

        const docRef = UsersService._getUserRef(user.uid);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const profile = { id: snapshot.id, ...snapshot.data() } as UserProfile;
            try {
                const privateSettingsSnap = await getDoc(UsersService._getPrivateSettingsRef(user.uid));
                if (!privateSettingsSnap.exists()) {
                    await setDoc(UsersService._getPrivateSettingsRef(user.uid), {
                        settings: UsersService._mergeSettings(profile.settings),
                        pushTokens: [],
                        blockedUsers: [],
                    }, { merge: true });
                }
            } catch (error: any) {
                if (!isPermissionDenied(error)) {
                    throw error;
                }
            }

            // Publish key data if not yet stored (e.g. signup race condition)
            if (!profile.publicKey) {
                await KeyManager.publishKeyData(user.uid).catch(() => {});
            }

            // Decrypt profile fields if needed (only email, bio is public plaintext)
            const fieldKey = await KeyManager.getFieldEncryptionKey();
            if (fieldKey && isEncryptedField(profile.email)) {
                return decryptProfileFields(profile, fieldKey) as UserProfile;
            }

            return profile;
        }

        // Create new profile
        const newProfile: Omit<UserProfile, 'id' | 'settings'> = {
            displayName: user.displayName || user.email?.split('@')[0] || 'Dreamer',
            bio: '',
            avatar: user.photoURL ?? undefined,
            publicDreamsCount: 0,
            completedDreamsCount: 0,
            createdAt: Date.now(),
        };

        // Encrypt sensitive fields if key is available (only email, bio is public plaintext)
        const fieldKey = await KeyManager.getFieldEncryptionKey();
        let firestoreData: Record<string, any> = Object.fromEntries(
            Object.entries(newProfile).filter(([, v]) => v !== undefined)
        );

        if (fieldKey && firestoreData.email) {
            firestoreData = encryptProfileFields(firestoreData, fieldKey);
        }

        await setDoc(docRef, firestoreData);
        try {
            await setDoc(UsersService._getPrivateSettingsRef(user.uid), {
                settings: UsersService._mergeSettings(),
                pushTokens: [],
                blockedUsers: [],
            }, { merge: true });
        } catch (error: any) {
            if (isPermissionDenied(error)) {
                await setDoc(UsersService._getLegacySettingsRef(user.uid), {
                    settings: UsersService._mergeSettings(),
                    pushTokens: [],
                    blockedUsers: [],
                }, { merge: true });
            } else {
                throw error;
            }
        }

        // Publish key data to the new user document
        await KeyManager.publishKeyData(user.uid).catch(() => {});

        return { id: user.uid, ...newProfile };
    },

    /**
     * Update current user's profile
     */
    async updateUserProfile(updates: Partial<Pick<UserProfile, 'displayName' | 'avatar' | 'bio' | 'settings'>>): Promise<void> {
        const user = auth.currentUser;
        if (!user) {
            throw new AppError('User not authenticated', ErrorCode.AUTH_REQUIRED, 'Please sign in to update your profile.');
        }

        // Validate input (only validate fields that are present)
        const validationData: Record<string, any> = {};
        if (updates.displayName !== undefined) validationData.displayName = updates.displayName;
        if (updates.bio !== undefined) validationData.bio = updates.bio;
        if (Object.keys(validationData).length > 0) {
            const validation = safeValidate(profileUpdateSchema, validationData);
            if (!validation.success) {
                throw new AppError(
                    `Validation failed: ${validation.error}`,
                    ErrorCode.VALIDATION_ERROR,
                    'Profile details are invalid. Please review and try again.',
                );
            }
        }

        // Encrypt sensitive fields if key is available (only email, bio is public plaintext)
        let updateData: Record<string, any> = { ...updates };
        const fieldKey = await KeyManager.getFieldEncryptionKey();
        if (updateData.email && !fieldKey) {
            throw new AppError(
                'Cannot update email without encryption key',
                ErrorCode.ENCRYPTION_ERROR,
                'Unable to securely save your email. Please try again after signing in.',
            );
        }
        if (fieldKey && updateData.email) {
            updateData = encryptProfileFields(updateData, fieldKey);
        }

        if (updateData.settings) {
            const currentSettings = await UsersService.getUserSettings(user.uid);
            const merged = UsersService._mergeSettings({
                ...(currentSettings || {}),
                ...updateData.settings,
            });
            try {
                await setDoc(UsersService._getPrivateSettingsRef(user.uid), {
                    settings: merged,
                }, { merge: true });
            } catch (error: any) {
                if (isPermissionDenied(error)) {
                    await setDoc(UsersService._getLegacySettingsRef(user.uid), {
                        settings: merged,
                    }, { merge: true });
                } else {
                    throw error;
                }
            }
            delete updateData.settings;
        }

        if (Object.keys(updateData).length > 0) {
            const docRef = UsersService._getUserRef(user.uid);
            try {
                await updateDoc(docRef, updateData);
            } catch (error) {
                throw toAppError(error, {
                    code: ErrorCode.UNKNOWN,
                    userMessage: 'Failed to update profile. Please try again.',
                });
            }
        }
    },

    /**
     * Increment public dreams count
     */
    async incrementPublicDreamsCount(delta: number = 1): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, COLLECTION_NAME, user.uid);
        await updateDoc(docRef, { publicDreamsCount: increment(delta) });
    },

    /**
     * Increment completed dreams count
     */
    async incrementCompletedDreamsCount(delta: number = 1): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, COLLECTION_NAME, user.uid);
        await updateDoc(docRef, { completedDreamsCount: increment(delta) });
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

        // Respect profile visibility settings for non-owners.
        const currentUserId = auth.currentUser?.uid;
        let targetProfile: UserProfile | null = null;
        if (currentUserId !== userId) {
            targetProfile = await UsersService.getUserProfile(userId);
            if (!targetProfile) return [];
        }

        const itemsRef = collection(db, 'items');
        // Avoid composite index by not using orderBy - sort client-side
        const q = query(
            itemsRef,
            where('userId', '==', userId),
            where('isPublic', '==', true),
            where('phase', 'in', ['doing', 'done'])
        );

        const snapshot = await getDocs(q);
        const dreams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        // Sort client-side by createdAt descending
        dreams.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

        if (currentUserId !== userId) {
            if (targetProfile?.settings?.privacy?.showCompletedDreams === false) {
                return dreams.filter((dream: any) => dream.phase !== 'done');
            }
        }

        return dreams;
    },
};
