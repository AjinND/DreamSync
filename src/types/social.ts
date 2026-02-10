/**
 * Social Types for DreamSync Community Features
 */

import { NotificationPreferences } from './notification';

export interface UserSettings {
    notifications: NotificationPreferences;
    privacy: {
        isPublicProfile: boolean;
        showCompletedDreams: boolean;
    };
    theme: 'system' | 'light' | 'dark';
}

/** @deprecated Legacy notification settings shape (pre-notification system) */
export interface LegacyNotificationSettings {
    comments: boolean;
    likes: boolean;
    mentions: boolean;
    journeyInvites: boolean;
}

export interface UserProfile {
    id: string;
    displayName: string;
    email?: string;
    avatar?: string;
    bio?: string;
    publicDreamsCount: number;
    completedDreamsCount: number;
    createdAt: number;
    settings?: UserSettings;
    // Encryption key data
    publicKey?: string;
    keyVersion?: number;
    keySalt?: string;
    keyIterations?: number;
    keyDerivationVersion?: number;
}

export interface Comment {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    text: string;
    createdAt: number;
}

// Available tags for dream discovery
export const DREAM_TAGS = [
    'solo',
    'group',
    'budget',
    'luxury',
    'weekend',
    'longterm',
    'outdoor',
    'indoor',
    'learning',
    'relaxation',
] as const;

export type DreamTag = typeof DREAM_TAGS[number];

export interface Journey {
    id: string;
    dreamId: string;
    ownerId: string;
    participants: string[]; // User IDs
    status: 'active' | 'completed';
    chatId: string;
    createdAt: number;
    settings?: {
        isOpen: boolean;
        maxParticipants: number;
    };
    requests?: string[]; // User IDs asking to join
    preview?: {
        title: string;
        description: string;
        image?: string | null;
        authorName: string;
        authorAvatar?: string | null;
    };
}
