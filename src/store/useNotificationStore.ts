/**
 * Notification Store (Zustand)
 * Manages in-app notification state with optimistic updates
 */

import { create } from 'zustand';
import { NotificationService } from '../services/notifications';
import { AppNotification } from '../types/notification';

interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchNotifications: () => Promise<void>;
    subscribeToUnread: () => void;
    unsubscribeFromUnread: () => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    incrementUnreadCount: () => void;
    clear: () => void;
}

let unsubscribeFn: (() => void) | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,

    fetchNotifications: async () => {
        set({ isLoading: true, error: null });
        try {
            const notifications = await NotificationService.getNotifications();
            const unreadCount = notifications.filter(n => !n.read).length;
            set({ notifications, unreadCount, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            set({ error: 'Failed to load notifications', isLoading: false });
        }
    },

    subscribeToUnread: () => {
        // Clean up any existing subscription
        if (unsubscribeFn) unsubscribeFn();

        unsubscribeFn = NotificationService.subscribeToUnreadCount(count => {
            set({ unreadCount: count });
        });
    },

    unsubscribeFromUnread: () => {
        if (unsubscribeFn) {
            unsubscribeFn();
            unsubscribeFn = null;
        }
    },

    markAsRead: async (id: string) => {
        // Optimistic update
        const prev = get().notifications;
        set({
            notifications: prev.map(n => (n.id === id ? { ...n, read: true } : n)),
            unreadCount: Math.max(0, get().unreadCount - 1),
        });

        try {
            await NotificationService.markAsRead(id);
        } catch (error) {
            console.error('Failed to mark as read:', error);
            // Revert
            set({ notifications: prev, unreadCount: get().unreadCount + 1 });
        }
    },

    markAllAsRead: async () => {
        const prev = get().notifications;
        set({
            notifications: prev.map(n => ({ ...n, read: true })),
            unreadCount: 0,
        });

        try {
            await NotificationService.markAllAsRead();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            set({ notifications: prev });
        }
    },

    deleteNotification: async (id: string) => {
        const prev = get().notifications;
        const target = prev.find(n => n.id === id);
        set({
            notifications: prev.filter(n => n.id !== id),
            unreadCount: target && !target.read
                ? Math.max(0, get().unreadCount - 1)
                : get().unreadCount,
        });

        try {
            await NotificationService.deleteNotification(id);
        } catch (error) {
            console.error('Failed to delete notification:', error);
            set({ notifications: prev });
        }
    },

    incrementUnreadCount: () => {
        set({ unreadCount: get().unreadCount + 1 });
    },

    clear: () => {
        if (unsubscribeFn) {
            unsubscribeFn();
            unsubscribeFn = null;
        }
        set({ notifications: [], unreadCount: 0, isLoading: false, error: null });
    },
}));
