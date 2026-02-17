import {
    get,
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
    increment,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
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
import { AppError, ErrorCode, toAppError } from '../utils/AppError';

const IMAGE_PREVIEW_TEXT = '[Image]';
const LEGACY_PREVIEW_PLACEHOLDERS = new Set([
    '[encrypted message]',
    'encrypted message',
    '[encrypted]',
]);
const legacyRepairInFlight = new Set<string>();
const legacyRepairCompleted = new Set<string>();

export interface SendMessageResult {
    encrypted: boolean;
    reason?: string;
}

export const ChatService = {
    /**
     * Touch chat metadata so Cloud Function syncs participants into RTDB.
     */
    ensureParticipantIndex: async (chatId: string): Promise<void> => {
        try {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, { updatedAt: serverTimestamp() });
        } catch (error) {
            console.warn('[ChatService] Failed to trigger participant index sync:', error);
        }
    },

    markChatAsRead: async (chatId: string): Promise<void> => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;
        try {
            await updateDoc(doc(db, 'chats', chatId), {
                [`unreadCounts.${currentUserId}`]: 0,
            });
        } catch (error) {
            console.warn('[ChatService] Failed to mark chat as read:', error);
        }
    },

    _isLegacyPreviewPlaceholder: (value?: string | null): boolean => {
        if (!value || typeof value !== 'string') return false;
        return LEGACY_PREVIEW_PLACEHOLDERS.has(value.trim().toLowerCase());
    },

    _normalizeLastMessageText: (text: string, type: 'text' | 'image'): string => {
        if (type === 'image') return IMAGE_PREVIEW_TEXT;
        const trimmed = (text || '').trim();
        if (!trimmed) return 'New message';
        if (ChatService._isLegacyPreviewPlaceholder(trimmed)) return 'New message';
        return trimmed;
    },

    _derivePreviewFromRawMessage: (msg: any): string => {
        const type = msg?.type === 'image' ? 'image' : 'text';
        if (type === 'image') return IMAGE_PREVIEW_TEXT;
        const text = typeof msg?.text === 'string' ? msg.text : '';
        const trimmed = text.trim();
        if (trimmed && !ChatService._isLegacyPreviewPlaceholder(trimmed)) return trimmed;
        return 'New message';
    },

    _repairLegacyChatPreview: async (chat: Chat): Promise<void> => {
        if (!chat?.id || legacyRepairInFlight.has(chat.id) || legacyRepairCompleted.has(chat.id)) {
            return;
        }

        const preview = chat.lastMessage?.text;
        if (!ChatService._isLegacyPreviewPlaceholder(preview)) return;

        legacyRepairInFlight.add(chat.id);

        try {
            const messagesRef = ref(rtdb, `messages/${chat.id}`);
            const latestQuery = rtdbQuery(messagesRef, limitToLast(1));
            const snapshot = await get(latestQuery);
            const val = snapshot.val();
            const latestRawMessage = val ? (Object.values(val)[0] as any) : null;

            const nextText = latestRawMessage
                ? ChatService._derivePreviewFromRawMessage(latestRawMessage)
                : 'New message';

            await updateDoc(doc(db, 'chats', chat.id), {
                lastMessage: {
                    text: nextText,
                    senderId: latestRawMessage?.senderId || chat.lastMessage?.senderId || '',
                    timestamp: Number(latestRawMessage?.createdAt) || chat.lastMessage?.timestamp || Date.now(),
                },
            });

            legacyRepairCompleted.add(chat.id);
        } catch (error) {
            console.warn('[ChatService] Legacy preview repair failed:', error);
        } finally {
            legacyRepairInFlight.delete(chat.id);
        }
    },

    /**
     * Create or get existing 1-on-1 Chat
     */
    createDMChat: async (otherUserId: string): Promise<string> => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
            throw new AppError('Not authenticated', ErrorCode.AUTH_REQUIRED, 'Please sign in to start chats.');
        }

        // Check if DM already exists
        // (In a real app, you might want to query this efficiently or store DM IDs in user profile)
        // For now, we will just create a new one or return existing if we find one (simple query)

        // This is a simplified check. Optimize in production.
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
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
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
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
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
    sendMessage: async (
        chatId: string,
        text: string,
        type: 'text' | 'image' = 'text',
        mediaUrl?: string,
        clientId?: string,
    ): Promise<SendMessageResult> => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
            throw new AppError('Not authenticated', ErrorCode.AUTH_REQUIRED, 'Please sign in to send messages.');
        }

        // Validate message input
        validate(messageSchema, { text, type, mediaUrl });

        const chatKeyPair = await KeyManager.getChatKeyPair();
        const chatDocRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatDocRef);
        const chatData = chatDoc.exists() ? chatDoc.data() as Chat : null;

        // 1. Determine encryption method and encrypt
        let messageData: Record<string, any>;
        let lastMessageText: string;
        let fallbackReason: string | null = null;

        const messagesRef = ref(rtdb, `messages/${chatId}`);
        const newMessageRef = push(messagesRef);

        if (chatKeyPair) {
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
                        clientId: clientId || null,
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

                    lastMessageText = ChatService._normalizeLastMessageText(text, type);
                } else {
                    // Fallback: send unencrypted if recipient has no public key
                    messageData = ChatService._buildPlaintextMessage(newMessageRef.key!, currentUserId, text, type, mediaUrl, clientId);
                    lastMessageText = ChatService._normalizeLastMessageText(text, type);
                    fallbackReason = 'recipient_missing_public_key';
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
                        clientId: clientId || null,
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

                    lastMessageText = ChatService._normalizeLastMessageText(text, type);
                } else {
                    messageData = ChatService._buildPlaintextMessage(newMessageRef.key!, currentUserId, text, type, mediaUrl, clientId);
                    lastMessageText = ChatService._normalizeLastMessageText(text, type);
                    fallbackReason = 'group_key_decrypt_failed';
                }
            } else {
                // No encryption keys available for this chat
                messageData = ChatService._buildPlaintextMessage(newMessageRef.key!, currentUserId, text, type, mediaUrl, clientId);
                lastMessageText = ChatService._normalizeLastMessageText(text, type);
                fallbackReason = 'chat_missing_encrypted_keys';
            }
        } else {
            // No key pair — send unencrypted
            messageData = ChatService._buildPlaintextMessage(newMessageRef.key!, currentUserId, text, type, mediaUrl, clientId);
            lastMessageText = ChatService._normalizeLastMessageText(text, type);
            fallbackReason = 'sender_missing_keypair';
        }

        await set(newMessageRef, messageData);

        const participants = chatData?.participants || [];
        const unreadUpdates: Record<string, any> = {};
        for (const uid of participants) {
            unreadUpdates[`unreadCounts.${uid}`] = uid === currentUserId ? 0 : increment(1);
        }

        // 2. Update Firestore Chat Metadata
        await updateDoc(chatDocRef, {
            lastMessage: {
                text: lastMessageText,
                senderId: currentUserId,
                timestamp: Date.now()
            },
            lastMessageAt: serverTimestamp(),
            ...unreadUpdates,
            updatedAt: serverTimestamp()
        });

        return fallbackReason
            ? { encrypted: false, reason: fallbackReason }
            : { encrypted: true };
    },

    /** Build a plaintext message object (no encryption). */
    _buildPlaintextMessage: (
        id: string,
        senderId: string,
        text: string,
        type: 'text' | 'image',
        mediaUrl?: string,
        clientId?: string,
    ) => ({
        id,
        clientId: clientId || null,
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
        let unsubscribeChatDoc: (() => void) | null = null;

        const refreshCachedGroupKey = async (chatData: Chat | null) => {
            cachedChatData = chatData;
            cachedGroupKey = null;

            if (!chatData || chatData.type === 'dm') return;

            const currentUserId = auth.currentUser?.uid;
            const chatKeyPair = await KeyManager.getChatKeyPair();
            if (!currentUserId || !chatKeyPair) return;

            const myEncKey = chatData.encryptedKeys?.[currentUserId];
            if (!myEncKey) return;

            try {
                const senderPubKey = decodeBase64(myEncKey.senderPublicKey);
                cachedGroupKey = decryptGroupKey(myEncKey, chatKeyPair.secretKey, senderPubKey);
            } catch {
                cachedGroupKey = null;
            }
        };

        unsubscribeChatDoc = onSnapshot(
            doc(db, 'chats', chatId),
            async (chatSnap) => {
                if (!chatSnap.exists()) {
                    await refreshCachedGroupKey(null);
                    return;
                }

                await refreshCachedGroupKey({
                    id: chatSnap.id,
                    ...chatSnap.data(),
                } as Chat);
            },
            () => {
                // Keep message stream active even if metadata watcher fails.
            }
        );

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
                        await refreshCachedGroupKey({
                            id: chatDoc.id,
                            ...chatDoc.data(),
                        } as Chat);
                    }
                } catch {
                    // Continue without decryption
                }
            }

            const messages: Message[] = await Promise.all(
                rawMessages.map(async (msg: any) => {
                    const base: Message = {
                        id: msg.id,
                        clientId: msg.clientId,
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
            if (unsubscribeChatDoc) unsubscribeChatDoc();
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
            __DEV__ && console.log(`[ChatService] Fetched ${snapshot.docs.length} chats`);
            const chats = snapshot.docs.map(doc => {
                const chat = { id: doc.id, ...doc.data() } as Chat;
                if (ChatService._isLegacyPreviewPlaceholder(chat.lastMessage?.text)) {
                    chat.lastMessage = {
                        ...chat.lastMessage,
                        text: 'New message',
                    } as Chat['lastMessage'];
                    void ChatService._repairLegacyChatPreview(chat);
                }
                return chat;
            });
            callback(chats);
        }, (error) => {
            console.error("[ChatService] Error subscribing to chats:", error);
            // If index is missing, it will log here
        });
    },

    /**
     * Update journey chat metadata (name/photo).
     */
    updateJourneyChatDetails: async (
        chatId: string,
        updates: { name?: string; photoUrl?: string | null },
    ): Promise<void> => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
            throw new AppError('Not authenticated', ErrorCode.AUTH_REQUIRED, 'Please sign in to edit chats.');
        }

        const chatDocRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatDocRef);
        if (!chatDoc.exists()) {
            throw new AppError('Chat not found', ErrorCode.NOT_FOUND, 'Chat not found.');
        }

        const chat = chatDoc.data() as Chat;
        if (chat.type !== 'journey') {
            throw new AppError('Only journey chats can be edited', ErrorCode.PERMISSION_DENIED, 'Only journey chats can be edited.');
        }
        if (!chat.participants?.includes(currentUserId)) {
            throw new AppError('Not a participant', ErrorCode.PERMISSION_DENIED, 'You are not a participant in this chat.');
        }

        const payload: Record<string, any> = { updatedAt: serverTimestamp() };

        if (typeof updates.name === 'string') {
            const trimmed = updates.name.trim();
            if (!trimmed) {
                throw new AppError('Group name cannot be empty', ErrorCode.VALIDATION_ERROR, 'Group name cannot be empty.');
            }
            payload.name = trimmed;
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'photoUrl')) {
            payload.photoUrl = updates.photoUrl ?? null;
        }

        try {
            await updateDoc(chatDocRef, payload);
        } catch (error) {
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to update chat details.',
            });
        }
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
