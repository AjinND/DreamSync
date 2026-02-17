import { EncryptedChatKey } from './encryption';

export interface Message {
    id: string;
    clientId?: string;
    senderId: string;
    text: string;
    createdAt: number;
    type: 'text' | 'image' | 'video' | 'system';
    mediaUrl?: string;
    readBy: { [userId: string]: number };
    // E2E encryption fields
    encrypted?: boolean;
    ciphertext?: string;
    nonce?: string;
    senderPublicKey?: string;
    encryptionVersion?: number;
    encryptedMediaUrl?: string;
    mediaUrlNonce?: string;
    // Optimistic UI fields
    _pending?: boolean;
    _failed?: boolean;
}

export interface Chat {
    id: string;
    type: 'dm' | 'journey';
    journeyId?: string;
    name?: string; // For Group/Journey chats
    photoUrl?: string | null; // For Group/Journey chats
    participants: string[];
    lastMessage?: {
        text: string;
        senderId: string;
        timestamp: number;
    };
    unreadCounts?: { [userId: string]: number };
    createdAt: number;
    updatedAt: number;
    // E2E encryption fields
    encryptedKeys?: { [userId: string]: EncryptedChatKey };
    encryptionEnabled?: boolean;
}
