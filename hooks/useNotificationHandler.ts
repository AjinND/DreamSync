/**
 * useNotificationHandler
 * Sets up foreground display config, notification listeners, and deep-link routing on tap.
 */

import * as Notifications from 'expo-notifications';
import { type Subscription } from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../src/store/useNotificationStore';
import { NotificationData } from '../src/types/notification';

// Configure how foreground notifications are displayed
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export function useNotificationHandler() {
    const router = useRouter();
    const notifReceivedRef = useRef<Subscription | null>(null);
    const notifResponseRef = useRef<Subscription | null>(null);

    useEffect(() => {
        // Foreground notification received → bump unread count
        notifReceivedRef.current = Notifications.addNotificationReceivedListener(() => {
            useNotificationStore.getState().incrementUnreadCount();
        });

        // User tapped a notification → route to the relevant screen
        notifResponseRef.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as NotificationData | undefined;
            if (!data) return;

            if (data.chatId) {
                router.push(`/chat/${data.chatId}` as any);
            } else if (data.dreamId) {
                router.push(`/item/${data.dreamId}` as any);
            } else if (data.screen) {
                router.push(data.screen as any);
            }
        });

        return () => {
            notifReceivedRef.current?.remove();
            notifResponseRef.current?.remove();
        };
    }, [router]);
}
