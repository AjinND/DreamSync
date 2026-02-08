/**
 * Notification Types for DreamSync
 */

export type NotificationType =
    | 'chat_message'
    | 'chat_added'
    | 'journey_request_accepted'
    | 'journey_request_rejected'
    | 'journey_participant_joined'
    | 'journey_updated'
    | 'community_comment'
    | 'community_like'
    | 'due_date_reminder';

export type NotificationCategory = 'chat' | 'journeys' | 'community' | 'reminders';

export const NOTIFICATION_TYPE_TO_CATEGORY: Record<NotificationType, NotificationCategory> = {
    chat_message: 'chat',
    chat_added: 'chat',
    journey_request_accepted: 'journeys',
    journey_request_rejected: 'journeys',
    journey_participant_joined: 'journeys',
    journey_updated: 'journeys',
    community_comment: 'community',
    community_like: 'community',
    due_date_reminder: 'reminders',
};

export interface NotificationData {
    screen?: string;
    dreamId?: string;
    chatId?: string;
    journeyId?: string;
    commentId?: string;
}

export interface AppNotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    createdAt: number;
    read: boolean;
    data: NotificationData;
    actorId?: string;
    actorName?: string;
    actorAvatar?: string;
}

export interface NotificationPreferences {
    pushEnabled: boolean;
    chatMessages: boolean;
    chatAdded: boolean;
    journeyRequests: boolean;
    journeyUpdates: boolean;
    communityComments: boolean;
    communityLikes: boolean;
    dueDateReminders: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    pushEnabled: true,
    chatMessages: true,
    chatAdded: true,
    journeyRequests: true,
    journeyUpdates: true,
    communityComments: true,
    communityLikes: true,
    dueDateReminders: true,
};
