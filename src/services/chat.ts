import {
    limitToLast,
    off,
    onValue,
    push,
    ref,
    query as rtdbQuery,
    serverTimestamp as rtdbTimestamp,
    set
} from 'firebase/database';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import { auth, db, rtdb } from '../../firebaseConfig';
import { Chat, Message } from '../types/chat';

export const ChatService = {
    /**
     * Create or get existing 1-on-1 Chat
     */
    createDMChat: async (otherUserId: string): Promise<string> => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) throw new Error("Not authenticated");

        // Check if DM already exists
        // (In a real app, you might want to query this efficiently or store DM IDs in user profile)
        // For now, we will just create a new one or return existing if we find one (simple query)

        // This is a simplified check. Optimize in production.
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('participants', 'array-contains', currentUserId), where('type', '==', 'dm'));
        // Note: Firestore array-contains only handles one value. We need to filter client side or use a different structure ID.
        // Better approach for DMs: ID = sort([uid1, uid2]).join('_')

        const sortedIds = [currentUserId, otherUserId].sort();
        const chatId = `dm_${sortedIds.join('_')}`;
        const chatDocRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatDocRef);

        if (chatDoc.exists()) {
            return chatId;
        }

        // Create new DM
        const newChat: Partial<Chat> = {
            id: chatId,
            type: 'dm',
            participants: sortedIds,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            unreadCounts: {
                [currentUserId]: 0,
                [otherUserId]: 0
            }
        };

        await setDoc(chatDocRef, newChat);
        return chatId;
    },

    /**
     * Create Journey Group Chat
     */
    createJourneyChat: async (journeyId: string, participants: string[], title?: string, image?: string | null): Promise<string> => {
        const chatId = `journey_${journeyId}`;
        const chatDocRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatDocRef);

        if (chatDoc.exists()) {
            // Update participants if needed
            await updateDoc(chatDocRef, { participants });
            return chatId;
        }

        const newChat: Partial<Chat> = {
            id: chatId,
            type: 'journey',
            journeyId,
            name: title || 'Journey Chat',
            photoUrl: image || null,
            participants,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            unreadCounts: participants.reduce((acc, uid) => ({ ...acc, [uid]: 0 }), {})
        };

        await setDoc(chatDocRef, newChat);
        return chatId;
    },

    /**
     * Send Message (RTDB + Firestore Metadata)
     */
    sendMessage: async (chatId: string, text: string, type: 'text' | 'image' = 'text', mediaUrl?: string) => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) throw new Error("Not authenticated");

        // 1. Push to Realtime Database
        const messagesRef = ref(rtdb, `messages/${chatId}`);
        const newMessageRef = push(messagesRef);

        const messageData = {
            id: newMessageRef.key,
            senderId: currentUserId,
            text,
            type,
            mediaUrl: mediaUrl || null,
            createdAt: rtdbTimestamp(),
            readBy: {
                [currentUserId]: rtdbTimestamp()
            }
        };

        await set(newMessageRef, messageData);

        // 2. Update Firestore Chat Metadata (Last Message & Unread Counts)
        const chatRef = doc(db, 'chats', chatId);
        // We need to increment unread counts for EVERYONE ELSE
        // This usually requires a cloud function for atomicity, but for now we do client side
        // Warning: Race conditions possible without Cloud Functions.

        // For MVP: Just update lastMessage and updatedAt. 
        // Real unread counts should be calculated or handled via backend.
        await updateDoc(chatRef, {
            lastMessage: {
                text: type === 'image' ? '📷 Image' : text,
                senderId: currentUserId,
                timestamp: Date.now()
            },
            updatedAt: Date.now()
        });
    },

    /**
     * Subscribe to Messages (RTDB)
     */
    subscribeToMessages: (chatId: string, callback: (messages: Message[]) => void) => {
        const messagesRef = ref(rtdb, `messages/${chatId}`);
        const q = rtdbQuery(messagesRef, limitToLast(50));

        const unsubscribe = onValue(q, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const messages: Message[] = Object.values(data).map((msg: any) => ({
                id: msg.id,
                senderId: msg.senderId,
                text: msg.text,
                createdAt: msg.createdAt,
                type: msg.type || 'text',
                mediaUrl: msg.mediaUrl,
                readBy: msg.readBy || {}
            }));

            // Sort by time
            messages.sort((a, b) => b.createdAt - a.createdAt);
            callback(messages);
        });

        return () => off(q);
    },

    /**
     * Fetch User's Chats (Firestore)
     */
    subscribeToChats: (callback: (chats: Chat[]) => void) => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return () => { };

        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('participants', 'array-contains', currentUserId),
            orderBy('updatedAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            console.log(`[ChatService] Fetched ${snapshot.docs.length} chats`);
            const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
            callback(chats);
        }, (error) => {
            console.error("[ChatService] Error subscribing to chats:", error);
            // If index is missing, it will log here
        });
    }
};
