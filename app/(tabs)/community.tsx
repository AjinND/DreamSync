/**
 * DreamSync - Community Tab
 * Modern borderless feed with smooth animations
 */

import { CategoryTabs, CommunityCard } from '@/src/components/community';
import { BucketLoaderFull } from '@/src/components/loading';
import { EmptyState, NotificationBell, SearchBar } from '@/src/components/shared';
import { useCommunityStore } from '@/src/store/useCommunityStore';
import { useTheme } from '@/src/theme';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Globe } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
        shuffledDreams,
        isLoading,
        selectedCategory,
        filterByCategory,
        toggleLike,
        refreshFeed,
        reshuffleFeed,
        fetchMore,
        hasMore,
        isFetchingMore,
    } = useCommunityStore();
    const [query, setQuery] = useState('');
    const visibleDreams = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return shuffledDreams;
        return shuffledDreams.filter((dream) =>
            dream.title.toLowerCase().includes(q) ||
            (dream.description || '').toLowerCase().includes(q)
        );
    }, [query, shuffledDreams]);

    // Initial fetch on mount
    useEffect(() => {
        refreshFeed();
    }, [refreshFeed]);

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
        reshuffleFeed(); // Also reshuffle the feed
    }, [refreshFeed, reshuffleFeed]);

    const renderItem = useCallback(
        ({ item }: { item: any }) => (
            <CommunityCard dream={item} onLike={toggleLike} />
        ),
        [toggleLike]
    );

    const renderFooter = useCallback(() => {
        if (!isFetchingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }, [colors.primary, isFetchingMore]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : colors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Fixed Header */}
            <View style={styles.headerContent}>
                <View style={styles.titleRow}>
                    <Globe size={28} color={colors.primary} />
                    <Text style={[styles.titleFlex, { color: colors.textPrimary }]}>Community</Text>
                    <NotificationBell />
                </View>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Dream. Explore. Inspire.
                </Text>
                <SearchBar
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search community dreams..."
                />
            </View>

            {/* Category tabs - full width, outside padded header */}
            <CategoryTabs
                selectedCategory={selectedCategory}
                onSelectCategory={filterByCategory}
            />

            {/* Loading State */}
            {isLoading && visibleDreams.length === 0 ? (
                <BucketLoaderFull message="Loading dreams..." />
            ) : (
                <FlatList
                    data={visibleDreams}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={MemoizedEmptyState}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading && visibleDreams.length > 0}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    onEndReachedThreshold={0.4}
                    onEndReached={() => {
                        if (hasMore && !isLoading && !isFetchingMore) {
                            fetchMore();
                        }
                    }}
                    ListFooterComponent={renderFooter}
                    // Performance optimizations
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={5}
                    updateCellsBatchingPeriod={50}
                    initialNumToRender={5}
                    windowSize={7}
                />
            )}
        </SafeAreaView>
    );
}

// Memoized components
const EmptyStateContent = () => {
    const { refreshFeed, reshuffleFeed } = useCommunityStore();

    const handleRefresh = () => {
        refreshFeed(true);
        reshuffleFeed();
    };

    return (
        <EmptyState
            icon={Globe}
            title="You're All Caught Up!"
            description="There’s nothing new right now. Check back soon for more dreams."
            action={{
                label: 'Refresh',
                onPress: handleRefresh,
            }}
        />
    );
};

const MemoizedEmptyState = memo(EmptyStateContent);
MemoizedEmptyState.displayName = 'MemoizedEmptyState';


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 0, // Edge-to-edge content
        paddingBottom: 100,
    },
    headerContent: {
        paddingHorizontal: 16, // Only header has horizontal padding
        paddingTop: 16,
        paddingBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
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
    footerLoader: {
        paddingVertical: 16,
        alignItems: 'center',
    },
});
