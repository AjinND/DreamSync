import { db } from '@/firebaseConfig';
import { Journey } from '@/src/types/social';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
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
                chatId: '', // Todo: Create chat implementation
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

            // ...

            // Create associated chat
            const chatId = await ChatService.createJourneyChat(
                docRef.id,
                [ownerId],
                previewData.title,
                previewData.image
            );

            // Update journey with chatId
            await updateDoc(docRef, { chatId });

            // Also make the dream public so others can view it
            const dreamRef = doc(db, 'items', dreamId);
            await updateDoc(dreamRef, {
                isPublic: true,
                collaborationType: 'group' // Ensure this is synced
            });

            return docRef.id;
        } catch (error) {
            console.error('Error creating journey:', error);
            throw error;
        }
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
            const journeyRef = doc(db, 'journeys', journeyId);
            await updateDoc(journeyRef, {
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
            const journeyRef = doc(db, 'journeys', journeyId);

            if (action === 'accept') {
                await updateDoc(journeyRef, {
                    participants: arrayUnion(userId),
                    requests: arrayRemove(userId)
                });
            } else {
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
    }
};
