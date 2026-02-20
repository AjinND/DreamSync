import { auth, db } from '@/firebaseConfig';
import { Journey } from '@/src/types/social';
import { Chat } from '@/src/types/chat';
import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteField,
    doc,
    DocumentData,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    QueryDocumentSnapshot,
    serverTimestamp,
    startAfter,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { decodeBase64 } from 'tweetnacl-util';
import { ChatService } from './chat';
import { decryptGroupKey, encryptGroupKeyForUser, generateGroupKey } from './encryption';
import { KeyManager } from './keyManager';
import { AppError, ErrorCode, toAppError } from '../utils/AppError';

export const JourneysService = {
    _normalizeSettings: (
        settings?: Partial<NonNullable<Journey['settings']>>
    ): Required<NonNullable<Journey['settings']>> => {
        const discoverability = settings?.discoverability ?? (settings?.isOpen ? 'public' : 'private');
        const joinPolicy = settings?.joinPolicy ?? 'request';
        const maxParticipants = settings?.maxParticipants || 5;
        const isOpen = discoverability === 'public';
        return { discoverability, joinPolicy, maxParticipants, isOpen };
    },

    /**
     * Create a new journey for a dream
     */
    createJourney: async (dreamId: string, ownerId: string, previewData: { title: string; description: string; image?: string | null; authorName: string; authorAvatar?: string | null }): Promise<string> => {
        try {
            const journeyData: Omit<Journey, 'id'> = {
                dreamId,
                ownerId,
                participants: [ownerId],
                status: 'active',
                chatId: '', // Deferred until 2nd participant joins
                createdAt: Date.now(),
                settings: {
                    isOpen: true,
                    discoverability: 'public',
                    joinPolicy: 'request',
                    maxParticipants: 5
                },
                requests: [],
                preview: {
                    title: previewData.title,
                    description: previewData.description,
                    authorName: previewData.authorName,
                    // Firestore does not accept undefined, so we default to null or omit if undefined
                    ...(previewData.image ? { image: previewData.image } : { image: null }),
                    ...(previewData.authorAvatar ? { authorAvatar: previewData.authorAvatar } : { authorAvatar: null }),
                }
            };

            // Batch write: create journey + update dream atomically
            const batch = writeBatch(db);
            const journeyRef = doc(collection(db, 'journeys'));
            const dreamRef = doc(db, 'items', dreamId);

            batch.set(journeyRef, journeyData);
            batch.update(dreamRef, {
                isPublic: true, // Journey dreams are publicly viewable for discoverability
                collaborationType: 'group',
                journeyParticipants: [ownerId] // Initialize with owner
            });

            await batch.commit();
            __DEV__ && console.log('[JourneysService] Journey created and dream updated with journeyParticipants:', [ownerId]);

            return journeyRef.id;
        } catch (error) {
            __DEV__ && console.error('Error creating journey:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to create journey. Please try again.',
            });
        }
    },

    /**
     * Ensure a journey has a chat. Creates one if chatId is empty.
     * Called when a 2nd participant joins (via joinJourney or handleJoinRequest).
     * Returns the chatId (existing or newly created).
     */
    ensureJourneyChat: async (journey: Journey): Promise<string> => {
        if (journey.chatId) return journey.chatId;

        const chatId = await ChatService.createJourneyChat(
            journey.id,
            journey.participants,
            journey.preview?.title,
            journey.preview?.image
        );

        const journeyRef = doc(db, 'journeys', journey.id);
        await updateDoc(journeyRef, { chatId });

        return chatId;
    },

    /**
     * Get a journey by its ID
     */
    getJourneyById: async (journeyId: string): Promise<Journey | null> => {
        try {
            const docRef = doc(db, 'journeys', journeyId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Journey;
            }
            return null;
        } catch (error) {
            __DEV__ && console.error('Error getting journey:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to load journey details.',
            });
        }
    },

    /**
     * Get journey associated with a specific dream
     */
    getJourneyByDreamId: async (dreamId: string): Promise<Journey | null> => {
        try {
            const q = query(collection(db, 'journeys'), where('dreamId', '==', dreamId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() } as Journey;
            }
            return null;
        } catch (error: any) {
            // Ignore permission errors for non-participants viewing public dreams
            if (error?.code !== 'permission-denied' && !error?.message?.includes('Missing or insufficient permissions')) {
                __DEV__ && console.error('Error getting journey by dream ID:', error);
            }
            return null;
        }
    },

    /**
     * Join a journey
     */
    joinJourney: async (journeyId: string, userId: string): Promise<void> => {
        try {
            // Get journey to find associated dream
            const journey = await JourneysService.getJourneyById(journeyId);
            if (!journey) throw new AppError('Journey not found', ErrorCode.NOT_FOUND, 'Journey not found.');

            // Batch write: journey participants + dream participants
            const batch = writeBatch(db);
            const journeyRef = doc(db, 'journeys', journeyId);
            const dreamRef = doc(db, 'items', journey.dreamId);

            batch.update(journeyRef, { participants: arrayUnion(userId) });
            batch.update(dreamRef, { journeyParticipants: arrayUnion(userId) });

            await batch.commit();
            __DEV__ && console.log('[JourneysService] Added user to journey and dream participants:', userId);

            // Build updated journey locally (avoid re-fetch)
            const updatedJourney = {
                ...journey,
                participants: [...journey.participants, userId]
            };

            // Ensure chat exists (creates on first 2nd participant) and add user
            const chatId = await JourneysService.ensureJourneyChat(updatedJourney);
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                participants: arrayUnion(userId)
            });

            // Distribute group encryption key to the new participant
            await JourneysService._distributeGroupKey(chatId, userId);
        } catch (error) {
            __DEV__ && console.error('Error joining journey:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to join journey. Please try again.',
            });
        }
    },

    /**
     * Update journey settings (e.g. open status, max participants)
     */
    updateSettings: async (
        journeyId: string,
        settings: Partial<{
            isOpen: boolean;
            discoverability: 'public' | 'private';
            joinPolicy: 'request' | 'open';
            maxParticipants: number;
        }>
    ): Promise<void> => {
        try {
            const currentUserId = auth.currentUser?.uid;
            const journeyRef = doc(db, 'journeys', journeyId);
            const journey = await JourneysService.getJourneyById(journeyId);
            const normalized = JourneysService._normalizeSettings({
                ...journey?.settings,
                ...settings,
            });

            await updateDoc(journeyRef, {
                settings: normalized,
                updatedAt: serverTimestamp(),
                ...(currentUserId ? { updatedBy: currentUserId } : {}),
            });

            // Keep linked dream discoverability in sync for community visibility.
            if (journey?.dreamId && normalized.discoverability) {
                const dreamRef = doc(db, 'items', journey.dreamId);
                await updateDoc(dreamRef, {
                    isPublic: normalized.discoverability === 'public',
                });
            }
        } catch (error) {
            __DEV__ && console.error('Error updating journey settings:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to update journey settings.',
            });
        }
    },

    /**
     * Request to join a journey
     */
    requestToJoin: async (journeyId: string, userId: string): Promise<void> => {
        try {
            const journeyRef = doc(db, 'journeys', journeyId);
            await updateDoc(journeyRef, {
                requests: arrayUnion(userId)
            });
        } catch (error) {
            __DEV__ && console.error('Error requesting to join:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to send join request.',
            });
        }
    },

    /**
     * Handle a join request (Accept or Reject)
     */
    handleJoinRequest: async (journeyId: string, userId: string, action: 'accept' | 'reject'): Promise<void> => {
        try {
            // Get journey to find associated dream
            const journey = await JourneysService.getJourneyById(journeyId);
            if (!journey) throw new AppError('Journey not found', ErrorCode.NOT_FOUND, 'Journey not found.');

            const journeyRef = doc(db, 'journeys', journeyId);

            if (action === 'accept') {
                const dreamRef = doc(db, 'items', journey.dreamId);

                // Atomic accept: journey + dream updates in a single batch.
                const batch = writeBatch(db);
                batch.update(journeyRef, {
                    participants: arrayUnion(userId),
                    requests: arrayRemove(userId)
                });
                batch.update(dreamRef, {
                    journeyParticipants: arrayUnion(userId)
                });
                await batch.commit();

                // Build updated journey locally (avoid re-fetch)
                const updatedJourney = {
                    ...journey,
                    participants: [...journey.participants, userId],
                    requests: (journey.requests || []).filter(id => id !== userId)
                };

                // Ensure chat exists (creates on first 2nd participant) and add user
                const chatId = await JourneysService.ensureJourneyChat(updatedJourney);
                const chatRef = doc(db, 'chats', chatId);
                await updateDoc(chatRef, {
                    participants: arrayUnion(userId)
                });

                // Distribute group encryption key to the accepted participant
                await JourneysService._distributeGroupKey(chatId, userId);
            } else {
                // Just remove the request
                await updateDoc(journeyRef, {
                    requests: arrayRemove(userId)
                });
            }
        } catch (error) {
            __DEV__ && console.error('Error handling join request:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to process join request.',
            });
        }
    },

    /**
     * Get Open Journeys (Looking for Partners)
     */
    getOpenJourneys: async (): Promise<Journey[]> => {
        const result = await JourneysService.getOpenJourneysPaginated(20, null);
        return result.journeys;
    },

    getOpenJourneysPaginated: async (
        pageSize: number = 20,
        cursor: QueryDocumentSnapshot<DocumentData> | null = null
    ): Promise<{
        journeys: Journey[];
        lastDoc: QueryDocumentSnapshot<DocumentData> | null;
        hasMore: boolean;
    }> => {
        try {
            const baseQuery = query(
                collection(db, 'journeys'),
                where('settings.discoverability', '==', 'public'),
                orderBy('createdAt', 'desc')
            );
            const pageQuery = cursor
                ? query(baseQuery, startAfter(cursor), limit(pageSize))
                : query(baseQuery, limit(pageSize));
            const snapshot = await getDocs(pageQuery);
            const journeys = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Journey));

            return {
                journeys,
                lastDoc: snapshot.empty ? cursor : snapshot.docs[snapshot.docs.length - 1],
                hasMore: snapshot.size >= pageSize,
            };
        } catch (error: any) {
            if (error.code === 'failed-precondition') {
                __DEV__ && console.error('Missing Firestore Index for Open Journeys query. Check Firebase Console.');
            }
            __DEV__ && console.error('Error fetching open journeys:', error);
            return { journeys: [], lastDoc: cursor, hasMore: false };
        }
    },

    /**
     * Get all journeys a user is participating in
     */
    getUserJourneys: async (userId: string): Promise<Journey[]> => {
        try {
            const q = query(collection(db, 'journeys'), where('participants', 'array-contains', userId));
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Journey));
        } catch (error) {
            __DEV__ && console.error('Error fetching user journeys:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to load your journeys.',
            });
        }
    },

    /**
     * Leave a journey (remove participant access)
     */
    leaveJourney: async (journeyId: string, userId: string): Promise<void> => {
        try {
            // Get journey to find associated dream
            const journey = await JourneysService.getJourneyById(journeyId);
            if (!journey) throw new AppError('Journey not found', ErrorCode.NOT_FOUND, 'Journey not found.');

            const journeyRef = doc(db, 'journeys', journeyId);
            const dreamRef = doc(db, 'items', journey.dreamId);
            const batch = writeBatch(db);

            // Atomic leave updates across journey + dream (+ chat when present)
            batch.update(journeyRef, {
                participants: arrayRemove(userId)
            });

            batch.update(dreamRef, {
                journeyParticipants: arrayRemove(userId)
            });

            if (journey.chatId) {
                const chatRef = doc(db, 'chats', journey.chatId);
                batch.update(chatRef, {
                    participants: arrayRemove(userId),
                    [`encryptedKeys.${userId}`]: deleteField(),
                });
            }

            await batch.commit();

            // Rotate group key for remaining participants after membership update succeeds.
            if (journey.chatId) {
                await JourneysService._rotateGroupKey(journey.chatId, userId);
            }            
        } catch (error) {
            __DEV__ && console.error('Error leaving journey:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to leave journey.',
            });
        }
    },

    /**
     * Distribute the group encryption key to a new participant.
     * The current user decrypts their copy of the group key, then re-encrypts it for the new user.
     */
    _distributeGroupKey: async (chatId: string, newUserId: string): Promise<void> => {
        try {
            const chatKeyPair = await KeyManager.getChatKeyPair();
            if (!chatKeyPair) return;

            const currentUserId = (await import('@/firebaseConfig')).auth.currentUser?.uid;
            if (!currentUserId) return;

            const chatDocRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatDocRef);
            if (!chatDoc.exists()) return;

            const chatData = chatDoc.data() as Chat;
            const myEncKey = chatData.encryptedKeys?.[currentUserId];
            if (!myEncKey) return;

            // Decrypt group key
            const senderPubKey = decodeBase64(myEncKey.senderPublicKey);
            const groupKey = decryptGroupKey(myEncKey, chatKeyPair.secretKey, senderPubKey);
            if (!groupKey) return;

            // Encrypt group key for the new user
            const newUserPublicKey = await KeyManager.getPublicKey(newUserId);
            if (!newUserPublicKey) return;

            const encryptedForNewUser = encryptGroupKeyForUser(
                groupKey,
                chatKeyPair.secretKey,
                newUserPublicKey,
                chatKeyPair.publicKey,
            );

            await updateDoc(chatDocRef, {
                [`encryptedKeys.${newUserId}`]: encryptedForNewUser,
            });
        } catch (error) {
            __DEV__ && console.error('[JourneysService] Failed to distribute group key:', error);
            // Non-fatal: chat will still work, just unencrypted for this user
        }
    },

    /**
     * Rotate the group encryption key after a participant leaves.
     * Generates a new group key and re-encrypts it for all remaining participants.
     */
    _rotateGroupKey: async (chatId: string, departedUserId: string): Promise<void> => {
        try {
            const chatKeyPair = await KeyManager.getChatKeyPair();
            if (!chatKeyPair) return;

            const chatDocRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatDocRef);
            if (!chatDoc.exists()) return;

            const chatData = chatDoc.data() as Chat;
            if (!chatData.encryptionEnabled) return;

            // Generate new group key
            const newGroupKey = generateGroupKey();

            // Re-encrypt for all remaining participants (except the departed user)
            const newEncryptedKeys: Record<string, any> = {};
            const remainingParticipants = chatData.participants.filter(
                (uid: string) => uid !== departedUserId,
            );

            // Parallelize public key fetches
            const publicKeys = await Promise.all(
                remainingParticipants.map(async (participantId: string) => ({
                    participantId,
                    pubKey: await KeyManager.getPublicKey(participantId)
                }))
            );

            publicKeys.forEach(({ participantId, pubKey }) => {
                if (pubKey) {
                    newEncryptedKeys[participantId] = encryptGroupKeyForUser(
                        newGroupKey,
                        chatKeyPair.secretKey,
                        pubKey,
                        chatKeyPair.publicKey,
                    );
                }
            });

            if (Object.keys(newEncryptedKeys).length > 0) {
                await updateDoc(chatDocRef, { encryptedKeys: newEncryptedKeys });
            }
        } catch (error) {
            __DEV__ && console.error('[JourneysService] Failed to rotate group key:', error);
        }
    },

    /**
     * Delete a journey entirely (owner only).
     * Cleans up: chat (Firestore + RTDB), dream fields, journey doc.
     */
    deleteJourney: async (journeyId: string, userId: string): Promise<void> => {
        try {
            const journey = await JourneysService.getJourneyById(journeyId);
            if (!journey) throw new AppError('Journey not found', ErrorCode.NOT_FOUND, 'Journey not found.');
            if (journey.ownerId !== userId) {
                throw new AppError(
                    'Only the owner can delete a journey',
                    ErrorCode.PERMISSION_DENIED,
                    'Only the journey owner can delete this journey.'
                );
            }

            // Delete chat if one was created (RTDB + Firestore, done separately)
            if (journey.chatId) {
                await ChatService.deleteJourneyChat(journey.chatId);
            }

            // Batch Firestore operations for atomicity: reset dream + delete journey
            const batch = writeBatch(db);

            const dreamRef = doc(db, 'items', journey.dreamId);
            batch.update(dreamRef, {
                collaborationType: 'solo',
                journeyParticipants: deleteField()
            });

            const journeyRef = doc(db, 'journeys', journeyId);
            batch.delete(journeyRef);

            await batch.commit();
        } catch (error) {
            __DEV__ && console.error('Error deleting journey:', error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to delete journey.',
            });
        }
    }
};
