/**
 * DreamSync - Community Tab
 * Public feed with dream discovery and social interactions
 */

import { CommunityCard, TagChips } from '@/src/components/community';
import { EmptyState, NotificationBell } from '@/src/components/shared';
import { useCommunityStore } from '@/src/store/useCommunityStore';
import { useTheme } from '@/src/theme';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Globe } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CommunityScreen() {
    const { colors, isDark } = useTheme();
    const {
        publicDreams,
        isLoading,
        selectedCategory,
        fetchPublicDreams,
        filterByCategory,
        toggleLike,
        refreshFeed,
    } = useCommunityStore();

    // Initial fetch on mount
    useEffect(() => {
        refreshFeed();
    }, []);

    // Refresh when tab is focused (uses smart caching with 30s TTL)
    // This ensures fresh comment/like counts when returning from detail screens
    // while avoiding unnecessary fetches during rapid tab switches
    useFocusEffect(
        useCallback(() => {
            refreshFeed(); // Uses cache if < 30s old
        }, [refreshFeed])
    );

    const handleRefresh = useCallback(() => {
        refreshFeed(true); // Force fresh data on pull-to-refresh
    }, [refreshFeed]);

    const renderItem = useCallback(
        ({ item }: { item: any }) => (
            <CommunityCard dream={item} onLike={toggleLike} />
        ),
        [toggleLike]
    );

    const ListHeader = () => (
        <View style={styles.headerContent}>
            <View style={styles.titleRow}>
                <Globe size={28} color={colors.primary} />
                <Text style={[styles.titleFlex, { color: colors.textPrimary }]}>Community</Text>
                <NotificationBell />
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Where dreamers share their dreams
            </Text>

            <TagChips
                selectedCategory={selectedCategory}
                onSelectCategory={filterByCategory}
            />
        </View>
    );

    const ListEmpty = () => {
        if (isLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading dreams...
                    </Text>
                </View>
            );
        }

        return (
            <EmptyState
                icon={Globe}
                title="No public dreams yet"
                description="Be the first to share your dream with the community!"
                action={{
                    label: 'Refresh',
                    onPress: handleRefresh,
                }}
            />
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <FlatList
                data={publicDreams}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={ListEmpty}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading && publicDreams.length > 0}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    headerContent: {
        paddingTop: 16,
        paddingBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
    },
    titleFlex: {
        flex: 1,
        fontSize: 32,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
});
