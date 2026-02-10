import { db } from '@/firebaseConfig';
import { Journey } from '@/src/types/social';
import { addDoc, arrayRemove, arrayUnion, collection, deleteField, doc, getDoc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { ChatService } from './chat';

export const JourneysService = {
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
                    isOpen: false,
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

            const docRef = await addDoc(collection(db, 'journeys'), journeyData);

            // Chat is deferred until a 2nd participant joins (see ensureJourneyChat)

            // Update dream with journey collaboration settings
            const dreamRef = doc(db, 'items', dreamId);
            await updateDoc(dreamRef, {
                isPublic: true, // Journey dreams are publicly viewable for discoverability
                collaborationType: 'group',
                journeyParticipants: [ownerId] // Initialize with owner
            });
            console.log('[JourneysService] Dream updated with journeyParticipants:', [ownerId]);

            return docRef.id;
        } catch (error) {
            console.error('Error creating journey:', error);
            throw error;
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
            console.error('Error getting journey:', error);
            throw error;
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
                console.error('Error getting journey by dream ID:', error);
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
            if (!journey) throw new Error('Journey not found');

            // Update journey participants
            const journeyRef = doc(db, 'journeys', journeyId);
            await updateDoc(journeyRef, {
                participants: arrayUnion(userId)
            });

            // Update dream's journeyParticipants to grant read access
            const dreamRef = doc(db, 'items', journey.dreamId);
            await updateDoc(dreamRef, {
                journeyParticipants: arrayUnion(userId)
            });
            console.log('[JourneysService] Added user to journeyParticipants:', userId);

            // Re-fetch journey to get latest participants (avoids race condition)
            const updatedJourney = await JourneysService.getJourneyById(journeyId);
            if (!updatedJourney) throw new Error('Journey not found after update');

            // Ensure chat exists (creates on first 2nd participant) and add user
            const chatId = await JourneysService.ensureJourneyChat(updatedJourney);
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                participants: arrayUnion(userId)
            });
        } catch (error) {
            console.error('Error joining journey:', error);
            throw error;
        }
    },

    /**
     * Update journey settings (e.g. open status, max participants)
     */
    updateSettings: async (journeyId: string, settings: { isOpen: boolean; maxParticipants: number }): Promise<void> => {
        try {
            const journeyRef = doc(db, 'journeys', journeyId);
            await updateDoc(journeyRef, { settings });
        } catch (error) {
            console.error('Error updating journey settings:', error);
            throw error;
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
            console.error('Error requesting to join:', error);
            throw error;
        }
    },

    /**
     * Handle a join request (Accept or Reject)
     */
    handleJoinRequest: async (journeyId: string, userId: string, action: 'accept' | 'reject'): Promise<void> => {
        try {
            // Get journey to find associated dream
            const journey = await JourneysService.getJourneyById(journeyId);
            if (!journey) throw new Error('Journey not found');

            const journeyRef = doc(db, 'journeys', journeyId);

            if (action === 'accept') {
                // Add to journey participants
                await updateDoc(journeyRef, {
                    participants: arrayUnion(userId),
                    requests: arrayRemove(userId)
                });

                // Grant dream access to the new participant
                const dreamRef = doc(db, 'items', journey.dreamId);
                await updateDoc(dreamRef, {
                    journeyParticipants: arrayUnion(userId)
                });

                // Re-fetch journey to get latest participants (avoids race condition)
                const updatedJourney = await JourneysService.getJourneyById(journeyId);
                if (!updatedJourney) throw new Error('Journey not found after update');

                // Ensure chat exists (creates on first 2nd participant) and add user
                const chatId = await JourneysService.ensureJourneyChat(updatedJourney);
                const chatRef = doc(db, 'chats', chatId);
                await updateDoc(chatRef, {
                    participants: arrayUnion(userId)
                });
            } else {
                // Just remove the request
                await updateDoc(journeyRef, {
                    requests: arrayRemove(userId)
                });
            }
        } catch (error) {
            console.error('Error handling join request:', error);
            throw error;
        }
    },

    /**
     * Get Open Journeys (Looking for Partners)
     */
    getOpenJourneys: async (): Promise<Journey[]> => {
        try {
            // Note: This requires a composite index on settings.isOpen if we sort or complex filter
            // For now, simpler query.
            const q = query(collection(db, 'journeys'), where('settings.isOpen', '==', true));
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Journey));
        } catch (error: any) {
            if (error.code === 'failed-precondition') {
                console.error('Missing Firestore Index for Open Journeys query. Check Firebase Console.');
            }
            console.error('Error fetching open journeys:', error);
            // Return empty instead of throwing to prevent UI break
            return [];
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
            console.error('Error fetching user journeys:', error);
            throw error;
        }
    },

    /**
     * Leave a journey (remove participant access)
     */
    leaveJourney: async (journeyId: string, userId: string): Promise<void> => {
        try {
            // Get journey to find associated dream
            const journey = await JourneysService.getJourneyById(journeyId);
            if (!journey) throw new Error('Journey not found');

            // Remove from journey participants
            const journeyRef = doc(db, 'journeys', journeyId);
            await updateDoc(journeyRef, {
                participants: arrayRemove(userId)
            });

            // Revoke dream access
            const dreamRef = doc(db, 'items', journey.dreamId);
            await updateDoc(dreamRef, {
                journeyParticipants: arrayRemove(userId)
            });

            // Remove from chat participants if chat exists
            if (journey.chatId) {
                const chatRef = doc(db, 'chats', journey.chatId);
                await updateDoc(chatRef, {
                    participants: arrayRemove(userId)
                });
            }
        } catch (error) {
            console.error('Error leaving journey:', error);
            throw error;
        }
    },

    /**
     * Delete a journey entirely (owner only).
     * Cleans up: chat (Firestore + RTDB), dream fields, journey doc.
     */
    deleteJourney: async (journeyId: string, userId: string): Promise<void> => {
        try {
            const journey = await JourneysService.getJourneyById(journeyId);
            if (!journey) throw new Error('Journey not found');
            if (journey.ownerId !== userId) throw new Error('Only the owner can delete a journey');

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
            console.error('Error deleting journey:', error);
            throw error;
        }
    }
};
