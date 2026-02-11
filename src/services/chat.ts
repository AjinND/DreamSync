import {
    limitToLast,
    off,
    onValue,
    push,
    ref,
    remove,
    query as rtdbQuery,
    serverTimestamp as rtdbTimestamp,
    set
} from 'firebase/database';
import {
    collection,
    deleteDoc,
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
import {
    decryptField,
    decryptFromSender,
    decryptGroupKey,
    encryptField,
    encryptForRecipient,
    encryptGroupKeyForUser,
    generateGroupKey,
} from './encryption';
import { KeyManager } from './keyManager';
import { validate, messageSchema } from './validation';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

export const ChatService = {
    /**
     * Touch chat metadata so Cloud Function syncs participants into RTDB.
     */
    ensureParticipantIndex: async (chatId: string): Promise<void> => {
        try {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, { updatedAt: Date.now() });
        } catch (error) {
            console.warn('[ChatService] Failed to trigger participant index sync:', error);
        }
    },

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

        // Generate group encryption key and encrypt for each participant
        const groupKey = generateGroupKey();
        const chatKeyPair = await KeyManager.getChatKeyPair();
        const encryptedKeys: Record<string, any> = {};

        if (chatKeyPair) {
            for (const userId of participants) {
                const publicKey = await KeyManager.getPublicKey(userId);
                if (publicKey) {
                    encryptedKeys[userId] = encryptGroupKeyForUser(
                        groupKey,
                        chatKeyPair.secretKey,
                        publicKey,
                        chatKeyPair.publicKey,
                    );
                }
            }
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
            unreadCounts: participants.reduce((acc, uid) => ({ ...acc, [uid]: 0 }), {}),
            encryptedKeys: Object.keys(encryptedKeys).length > 0 ? encryptedKeys : undefined,
            encryptionEnabled: Object.keys(encryptedKeys).length > 0,
        };

        // Strip undefined values for Firestore
        const firestoreData = Object.fromEntries(
            Object.entries(newChat).filter(([, v]) => v !== undefined)
        );

        await setDoc(chatDocRef, firestoreData);
        return chatId;
    },

    /**
     * Send Message (RTDB + Firestore Metadata)
     */
    sendMessage: async (chatId: string, text: string, type: 'text' | 'image' = 'text', mediaUrl?: string) => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) throw new Error("Not authenticated");

        // Validate message input
        validate(messageSchema, { text, type });

        const chatKeyPair = await KeyManager.getChatKeyPair();

        // 1. Determine encryption method and encrypt
        let messageData: Record<string, any>;
        let lastMessageText: string;

        const messagesRef = ref(rtdb, `messages/${chatId}`);
        const newMessageRef = push(messagesRef);

        if (chatKeyPair) {
            // Fetch chat doc to determine DM vs group encryption
            const chatDocRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatDocRef);
            const chatData = chatDoc.exists() ? chatDoc.data() as Chat : null;

            if (chatData?.type === 'dm') {
                // DM: Asymmetric encryption (nacl.box)
                const otherUserId = chatData.participants.find(uid => uid !== currentUserId);
                const recipientPublicKey = otherUserId
                    ? await KeyManager.getPublicKey(otherUserId)
                    : null;

                if (recipientPublicKey) {
                    const payload = encryptForRecipient(text, chatKeyPair.secretKey, recipientPublicKey, chatKeyPair.publicKey);
                    messageData = {
                        id: newMessageRef.key,
                        senderId: currentUserId,
                        text: '', // Cleared for encrypted messages
                        type,
                        encrypted: true,
                        ciphertext: payload.ciphertext,
                        nonce: payload.nonce,
                        senderPublicKey: payload.senderPublicKey,
                        encryptionVersion: payload.version,
                        mediaUrl: mediaUrl || null,
                        createdAt: rtdbTimestamp(),
                        readBy: { [currentUserId]: rtdbTimestamp() },
                    };

                    // Encrypt media URL if present
                    if (mediaUrl) {
                        const encMediaUrl = encryptForRecipient(mediaUrl, chatKeyPair.secretKey, recipientPublicKey, chatKeyPair.publicKey);
                        messageData.encryptedMediaUrl = encMediaUrl.ciphertext;
                        messageData.mediaUrlNonce = encMediaUrl.nonce;
                        messageData.mediaUrl = null; // Clear plaintext
                    }

                    lastMessageText = '[Encrypted message]';
                } else {
                    // Fallback: send unencrypted if recipient has no public key
                    messageData = ChatService._buildPlaintextMessage(newMessageRef.key!, currentUserId, text, type, mediaUrl);
                    lastMessageText = type === 'image' ? '📷 Image' : text;
                }
            } else if (chatData?.encryptedKeys?.[currentUserId]) {
                // Group: Symmetric encryption with group key
                const myEncKey = chatData.encryptedKeys[currentUserId];
                const senderPublicKeyBytes = decodeBase64(myEncKey.senderPublicKey);
                const groupKey = decryptGroupKey(myEncKey, chatKeyPair.secretKey, senderPublicKeyBytes);

                if (groupKey) {
                    const encrypted = encryptField(text, groupKey);
                    messageData = {
                        id: newMessageRef.key,
                        senderId: currentUserId,
                        text: '', // Cleared
                        type,
                        encrypted: true,
                        ciphertext: encrypted.c,
                        nonce: encrypted.n,
                        senderPublicKey: encodeBase64(chatKeyPair.publicKey),
                        encryptionVersion: encrypted.v,
                        mediaUrl: mediaUrl || null,
                        createdAt: rtdbTimestamp(),
                        readBy: { [currentUserId]: rtdbTimestamp() },
                    };

                    if (mediaUrl) {
                        const encMedia = encryptField(mediaUrl, groupKey);
                        messageData.encryptedMediaUrl = encMedia.c;
                        messageData.mediaUrlNonce = encMedia.n;
                        messageData.mediaUrl = null;
                    }

                    lastMessageText = '[Encrypted message]';
                } else {
                    messageData = ChatService._buildPlaintextMessage(newMessageRef.key!, currentUserId, text, type, mediaUrl);
                    lastMessageText = type === 'image' ? '📷 Image' : text;
                }
            } else {
                // No encryption keys available for this chat
                messageData = ChatService._buildPlaintextMessage(newMessageRef.key!, currentUserId, text, type, mediaUrl);
                lastMessageText = type === 'image' ? '📷 Image' : text;
            }
        } else {
            // No key pair — send unencrypted
            messageData = ChatService._buildPlaintextMessage(newMessageRef.key!, currentUserId, text, type, mediaUrl);
            lastMessageText = type === 'image' ? '📷 Image' : text;
        }

        await set(newMessageRef, messageData);

        // 2. Update Firestore Chat Metadata
        const chatRef = doc(db, 'chats', chatId);
        await updateDoc(chatRef, {
            lastMessage: {
                text: lastMessageText,
                senderId: currentUserId,
                timestamp: Date.now()
            },
            updatedAt: Date.now()
        });
    },

    /** Build a plaintext message object (no encryption). */
    _buildPlaintextMessage: (id: string, senderId: string, text: string, type: string, mediaUrl?: string) => ({
        id,
        senderId,
        text,
        type,
        mediaUrl: mediaUrl || null,
        createdAt: rtdbTimestamp(),
        readBy: { [senderId]: rtdbTimestamp() },
    }),

    /**
     * Subscribe to Messages (RTDB)
     */
    subscribeToMessages: (chatId: string, callback: (messages: Message[]) => void) => {
        const messagesRef = ref(rtdb, `messages/${chatId}`);
        const q = rtdbQuery(messagesRef, limitToLast(50));
        let isDisposed = false;

        // Cache chat data + keys for decryption
        let cachedChatData: Chat | null = null;
        let cachedGroupKey: Uint8Array | null = null;
        let unsubscribeValue: (() => void) | null = null;

        const subscribe = (hasRetried = false) => onValue(q, async (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const rawMessages: any[] = Object.values(data);
            const chatKeyPair = await KeyManager.getChatKeyPair();

            // Lazy-load chat data for group key decryption
            if (!cachedChatData && chatKeyPair) {
                try {
                    const chatDocRef = doc(db, 'chats', chatId);
                    const chatDoc = await getDoc(chatDocRef);
                    if (chatDoc.exists()) {
                        cachedChatData = chatDoc.data() as Chat;

                        // Decrypt group key if available
                        const currentUserId = auth.currentUser?.uid;
                        if (currentUserId && cachedChatData.encryptedKeys?.[currentUserId]) {
                            const myEncKey = cachedChatData.encryptedKeys[currentUserId];
                            const senderPubKey = decodeBase64(myEncKey.senderPublicKey);
                            cachedGroupKey = decryptGroupKey(myEncKey, chatKeyPair.secretKey, senderPubKey);
                        }
                    }
                } catch {
                    // Continue without decryption
                }
            }

            const messages: Message[] = await Promise.all(
                rawMessages.map(async (msg: any) => {
                    const base: Message = {
                        id: msg.id,
                        senderId: msg.senderId,
                        text: msg.text || '',
                        createdAt: msg.createdAt,
                        type: msg.type || 'text',
                        mediaUrl: msg.mediaUrl,
                        readBy: msg.readBy || {},
                        encrypted: msg.encrypted,
                    };

                    // Decrypt if message is encrypted
                    if (msg.encrypted && chatKeyPair) {
                        try {
                            if (cachedChatData?.type === 'dm') {
                                // DM: asymmetric decryption
                                // nacl.box shared secret = scalar_mult(my_secret, their_public)
                                // For decryption, we always need the OTHER party's public key.
                                // If we sent the message, use the other participant's pubkey.
                                // If we received the message, use the sender's pubkey.
                                const currentUserId = auth.currentUser?.uid;
                                const isSender = msg.senderId === currentUserId;

                                let counterpartyPubKey: Uint8Array | null = null;
                                if (isSender) {
                                    // We sent this — need the other participant's public key
                                    const otherUserId = cachedChatData.participants.find(
                                        (uid: string) => uid !== currentUserId,
                                    );
                                    if (otherUserId) {
                                        counterpartyPubKey = await KeyManager.getPublicKey(otherUserId);
                                    }
                                } else {
                                    // We received this — need the sender's public key
                                    counterpartyPubKey = msg.senderPublicKey
                                        ? decodeBase64(msg.senderPublicKey)
                                        : await KeyManager.getPublicKey(msg.senderId);
                                }

                                if (counterpartyPubKey) {
                                    const decrypted = decryptFromSender(
                                        {
                                            ciphertext: msg.ciphertext,
                                            nonce: msg.nonce,
                                            senderPublicKey: msg.senderPublicKey,
                                            version: msg.encryptionVersion || 1,
                                        },
                                        chatKeyPair.secretKey,
                                        counterpartyPubKey,
                                    );
                                    base.text = decrypted ?? '[Unable to decrypt]';

                                    // Decrypt media URL
                                    if (msg.encryptedMediaUrl && msg.mediaUrlNonce) {
                                        const decMedia = decryptFromSender(
                                            {
                                                ciphertext: msg.encryptedMediaUrl,
                                                nonce: msg.mediaUrlNonce,
                                                senderPublicKey: msg.senderPublicKey,
                                                version: msg.encryptionVersion || 1,
                                            },
                                            chatKeyPair.secretKey,
                                            counterpartyPubKey,
                                        );
                                        if (decMedia) base.mediaUrl = decMedia;
                                    }
                                } else {
                                    base.text = '[Unable to decrypt]';
                                }
                            } else if (cachedGroupKey) {
                                // Group: symmetric decryption
                                const decrypted = decryptField(
                                    { c: msg.ciphertext, n: msg.nonce, v: msg.encryptionVersion || 1 },
                                    cachedGroupKey,
                                );
                                base.text = decrypted ?? '[Unable to decrypt]';

                                if (msg.encryptedMediaUrl && msg.mediaUrlNonce) {
                                    const decMedia = decryptField(
                                        { c: msg.encryptedMediaUrl, n: msg.mediaUrlNonce, v: msg.encryptionVersion || 1 },
                                        cachedGroupKey,
                                    );
                                    if (decMedia) base.mediaUrl = decMedia;
                                }
                            } else {
                                base.text = '[Unable to decrypt]';
                            }
                        } catch {
                            base.text = '[Unable to decrypt]';
                        }
                    }

                    return base;
                }),
            );

            // Sort by time (Newest First for Inverted List)
            messages.sort((a, b) => {
                const timeA = a.createdAt || 0;
                const timeB = b.createdAt || 0;
                return timeB - timeA;
            });

            callback(messages);
        }, async (error) => {
            const errorCode = String((error as any)?.code || '').toLowerCase();
            console.error('[ChatService] Message subscription error:', error);

            if (!hasRetried && errorCode.includes('permission_denied')) {
                await ChatService.ensureParticipantIndex(chatId);
                if (!isDisposed) {
                    setTimeout(() => {
                        if (!isDisposed) {
                            unsubscribeValue = subscribe(true);
                        }
                    }, 600);
                }
                return;
            }

            callback([]);
        });

        unsubscribeValue = subscribe(false);

        return () => {
            isDisposed = true;
            if (unsubscribeValue) unsubscribeValue();
            off(q);
        };
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
    },

    /**
     * Delete a journey chat (Firestore doc + RTDB messages)
     */
    deleteJourneyChat: async (chatId: string): Promise<void> => {
        // Delete Firestore chat document
        const chatDocRef = doc(db, 'chats', chatId);
        await deleteDoc(chatDocRef);

        // Delete all RTDB messages for this chat
        const messagesRef = ref(rtdb, `messages/${chatId}`);
        await remove(messagesRef);
    }
};
