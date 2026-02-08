/**
 * NotificationItem — A single row in the notification center
 * Shows actor avatar (or type icon), title, body, time, and unread indicator
 */

import { UserAvatar } from '@/src/components/social/UserAvatar';
import { useTheme } from '@/src/theme';
import { AppNotification } from '@/src/types/notification';
import {
    formatNotificationTime,
    getNotificationColor,
    getNotificationIcon,
} from '@/src/utils/notificationHelpers';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NotificationItemProps {
    notification: AppNotification;
    onPress: (notification: AppNotification) => void;
    onLongPress?: (notification: AppNotification) => void;
}

export function NotificationItem({ notification, onPress, onLongPress }: NotificationItemProps) {
    const { colors } = useTheme();
    const Icon = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type);
    const timeText = formatNotificationTime(notification.createdAt);

    const unreadBg = notification.read ? 'transparent' : colors.primary + '08';

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: unreadBg }]}
            onPress={() => onPress(notification)}
            onLongPress={() => onLongPress?.(notification)}
            activeOpacity={0.7}
        >
            {/* Avatar or icon */}
            <View style={styles.avatarCol}>
                {notification.actorName ? (
                    <UserAvatar
                        userId={notification.actorId}
                        name={notification.actorName}
                        avatar={notification.actorAvatar}
                        size="medium"
                    />
                ) : (
                    <View style={[styles.iconCircle, { backgroundColor: iconColor + '15' }]}>
                        <Icon size={20} color={iconColor} />
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text
                    style={[
                        styles.title,
                        { color: colors.textPrimary },
                        !notification.read && styles.titleUnread,
                    ]}
                    numberOfLines={1}
                >
                    {notification.title}
                </Text>
                <Text
                    style={[styles.body, { color: colors.textSecondary }]}
                    numberOfLines={2}
                >
                    {notification.body}
                </Text>
                <Text style={[styles.time, { color: colors.textMuted }]}>
                    {timeText}
                </Text>
            </View>

            {/* Unread dot */}
            {!notification.read && (
                <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    avatarCol: {
        width: 40,
        alignItems: 'center',
        paddingTop: 2,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        marginBottom: 2,
    },
    titleUnread: {
        fontWeight: '600',
    },
    body: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 4,
    },
    time: {
        fontSize: 12,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
    },
});
