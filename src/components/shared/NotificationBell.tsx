/**
 * NotificationBell — Bell icon with unread badge overlay
 * Navigates to the notification center on press
 */

import { useNotificationStore } from '@/src/store/useNotificationStore';
import { useTheme } from '@/src/theme';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function NotificationBell() {
    const { colors } = useTheme();
    const router = useRouter();
    const unreadCount = useNotificationStore(s => s.unreadCount);

    const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => router.push('/notifications' as any)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <Bell size={24} color={colors.textPrimary} strokeWidth={1.8} />
            {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                    <Text style={styles.badgeText}>{badgeText}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        padding: 4,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 12,
    },
});
