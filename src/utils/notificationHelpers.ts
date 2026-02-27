/**
 * Notification Helpers
 * Icon mapping, time formatting, and date grouping for the notification center
 */

import {
    Bell,
    Calendar,
    Heart,
    MessageCircle,
    MessageSquare,
    UserCheck,
    UserPlus,
    UserX,
    Users,
 LucideIcon } from 'lucide-react-native';

import { AppNotification, NotificationType } from '../types/notification';

const ICON_MAP: Record<NotificationType, LucideIcon> = {
    chat_message: MessageCircle,
    chat_added: MessageSquare,
    journey_request_accepted: UserCheck,
    journey_request_rejected: UserX,
    journey_participant_joined: UserPlus,
    journey_updated: Users,
    community_comment: MessageCircle,
    community_like: Heart,
    due_date_reminder: Calendar,
};

const COLOR_MAP: Record<NotificationType, string> = {
    chat_message: '#3B82F6',      // Blue
    chat_added: '#3B82F6',        // Blue
    journey_request_accepted: '#10B981', // Green
    journey_request_rejected: '#EF4444', // Red
    journey_participant_joined: '#8B5CF6', // Purple
    journey_updated: '#8B5CF6',   // Purple
    community_comment: '#F59E0B', // Amber
    community_like: '#FB7185',    // Coral
    due_date_reminder: '#F97316', // Orange
};

export function getNotificationIcon(type: NotificationType): LucideIcon {
    return ICON_MAP[type] ?? Bell;
}

export function getNotificationColor(type: NotificationType): string {
    return COLOR_MAP[type] ?? '#64748B';
}

/**
 * Returns a human-readable relative time string
 */
export function formatNotificationTime(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export interface NotificationGroup {
    title: string;
    data: AppNotification[];
}

/**
 * Groups notifications into "Today", "This Week", and "Earlier"
 */
export function groupNotificationsByDate(notifications: AppNotification[]): NotificationGroup[] {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - (now.getDay() * 24 * 60 * 60 * 1000);

    const today: AppNotification[] = [];
    const thisWeek: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    for (const notif of notifications) {
        if (notif.createdAt >= startOfToday) {
            today.push(notif);
        } else if (notif.createdAt >= startOfWeek) {
            thisWeek.push(notif);
        } else {
            earlier.push(notif);
        }
    }

    const groups: NotificationGroup[] = [];
    if (today.length > 0) groups.push({ title: 'Today', data: today });
    if (thisWeek.length > 0) groups.push({ title: 'This Week', data: thisWeek });
    if (earlier.length > 0) groups.push({ title: 'Earlier', data: earlier });

    return groups;
}
