export interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: number;
    type: 'text' | 'image' | 'video' | 'system';
    mediaUrl?: string;
    readBy: { [userId: string]: number };
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
}
