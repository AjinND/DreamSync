/**
 * Notification Center Screen
 * Displays all notifications grouped by date with pull-to-refresh and mark-all-read
 */

import { NotificationItem } from '@/src/components/notification/NotificationItem';
import { EmptyState } from '@/src/components/shared';
import { useNotificationStore } from '@/src/store/useNotificationStore';
import { useTheme } from '@/src/theme';
import { AppNotification } from '@/src/types/notification';
import { groupNotificationsByDate } from '@/src/utils/notificationHelpers';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, CheckCheck, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Swipeable as SwipeableType } from 'react-native-gesture-handler';

export default function NotificationsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const {
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotificationStore();

    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const groups = useMemo(
        () => groupNotificationsByDate(notifications),
        [notifications],
    );

    // Flatten groups into a list with section headers for FlatList
    const flatData = useMemo(() => {
        const result: ({ type: 'header'; title: string } | { type: 'item'; notification: AppNotification })[] = [];
        for (const group of groups) {
            result.push({ type: 'header', title: group.title });
            for (const notif of group.data) {
                result.push({ type: 'item', notification: notif });
            }
        }
        return result;
    }, [groups]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    };

    const handleNotificationPress = async (notif: AppNotification) => {
        if (!notif.read) {
            await markAsRead(notif.id);
        }

        // Navigate based on data
        if (notif.data.chatId) {
            router.push(`/chat/${notif.data.chatId}` as any);
        } else if (notif.data.dreamId) {
            router.push(`/item/${notif.data.dreamId}` as any);
        } else if (notif.data.screen) {
            router.push(notif.data.screen as any);
        }
    };

    const swipeableRefs = useRef<Record<string, SwipeableType | null>>({});

    const renderSwipeDeleteAction = (notificationId: string) => (
        <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.deleteAction, { backgroundColor: colors.error }]}
            onPress={() => {
                swipeableRefs.current[notificationId]?.close();
                deleteNotification(notificationId);
            }}
        >
            <Trash2 size={18} color="#FFFFFF" />
            <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
    );

    const renderItem = ({ item }: { item: (typeof flatData)[number] }) => {
        if (item.type === 'header') {
            return (
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
                        {item.title}
                    </Text>
                </View>
            );
        }

        return (
            <Swipeable
                ref={(ref) => {
                    swipeableRefs.current[item.notification.id] = ref;
                }}
                renderLeftActions={() => renderSwipeDeleteAction(item.notification.id)}
                overshootLeft={false}
                leftThreshold={60}
            >
                <NotificationItem
                    notification={item.notification}
                    onPress={handleNotificationPress}
                />
            </Swipeable>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    Notifications
                </Text>

                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                        <CheckCheck size={20} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {isLoading && notifications.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={flatData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) =>
                        item.type === 'header' ? `header-${item.title}` : item.notification.id
                    }
                    ListEmptyComponent={
                        <EmptyState
                            icon={Bell}
                            title="No Notifications"
                            description="You're all caught up! Notifications about your dreams, journeys, and community will appear here."
                        />
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    contentContainerStyle={notifications.length === 0 ? styles.emptyContent : styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
    },
    markAllButton: {
        padding: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    listContent: {
        paddingBottom: 40,
    },
    deleteAction: {
        width: 104,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    deleteActionText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    emptyContent: {
        flex: 1,
    },
});
