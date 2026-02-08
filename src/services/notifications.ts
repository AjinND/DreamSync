/**
 * Notification Service for DreamSync
 * Handles push token registration, notification CRUD, and real-time unread count
 */

import * as Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getCountFromServer,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { AppNotification } from '../types/notification';

export const NotificationService = {
    /**
     * Register for push notifications and return the Expo push token.
     * Creates the Android notification channel as a side effect.
     */
    async registerForPushNotifications(): Promise<string | null> {
        if (!Device.isDevice) {
            console.warn('Push notifications require a physical device');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Push notification permission not granted');
            return null;
        }

        // Create Android channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('dreamsync-default', {
                name: 'DreamSync',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#A78BFA',
            });
        }

        const projectId = Constants.default.expoConfig?.extra?.eas?.projectId
            ?? Constants.default.easConfig?.projectId;

        if (!projectId) {
            console.warn('No EAS project ID found — push tokens unavailable');
            return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        return tokenData.data;
    },

    /**
     * Store push token in the user's Firestore document (array union)
     */
    async storePushToken(token: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { pushTokens: arrayUnion(token) });
    },

    /**
     * Remove push token from the user's Firestore document
     */
    async removePushToken(token: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { pushTokens: arrayRemove(token) });
    },

    /**
     * Fetch notifications for the current user
     */
    async getNotifications(maxResults: number = 50): Promise<AppNotification[]> {
        const user = auth.currentUser;
        if (!user) return [];

        const notifRef = collection(db, 'notifications');
        const q = query(
            notifRef,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(maxResults),
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
    },

    /**
     * Mark a single notification as read
     */
    async markAsRead(notifId: string): Promise<void> {
        const notifRef = doc(db, 'notifications', notifId);
        await updateDoc(notifRef, { read: true });
    },

    /**
     * Mark all unread notifications as read for the current user (batch)
     */
    async markAllAsRead(): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        const notifRef = collection(db, 'notifications');
        const q = query(
            notifRef,
            where('userId', '==', user.uid),
            where('read', '==', false),
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
    },

    /**
     * Delete a notification
     */
    async deleteNotification(notifId: string): Promise<void> {
        const notifRef = doc(db, 'notifications', notifId);
        await deleteDoc(notifRef);
    },

    /**
     * Get the count of unread notifications
     */
    async getUnreadCount(): Promise<number> {
        const user = auth.currentUser;
        if (!user) return 0;

        const notifRef = collection(db, 'notifications');
        const q = query(
            notifRef,
            where('userId', '==', user.uid),
            where('read', '==', false),
        );

        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    },

    /**
     * Subscribe to unread count changes in real time.
     * Returns an unsubscribe function.
     */
    subscribeToUnreadCount(callback: (count: number) => void): () => void {
        const user = auth.currentUser;
        if (!user) {
            callback(0);
            return () => {};
        }

        const notifRef = collection(db, 'notifications');
        const q = query(
            notifRef,
            where('userId', '==', user.uid),
            where('read', '==', false),
        );

        return onSnapshot(q, snapshot => {
            callback(snapshot.size);
        }, error => {
            console.error('Unread count listener error:', error);
            callback(0);
        });
    },
};
