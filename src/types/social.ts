/**
 * Social Types for DreamSync Community Features
 */

export interface UserSettings {
    notifications: {
        comments: boolean;
        likes: boolean;
        mentions: boolean;
        journeyInvites: boolean;
    };
    privacy: {
        isPublicProfile: boolean;
        showCompletedDreams: boolean;
    };
    theme: 'system' | 'light' | 'dark';
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
