/**
 * DreamSync - Journeys Tab (Placeholder)
 * Shared dreams, collaboration, group journeys
 */

import { auth } from '@/firebaseConfig'; // Added import
import { DreamCard } from '@/src/components/dream/DreamCard';
import { BucketLoaderInline } from '@/src/components/loading';
import { EmptyState, NotificationBell } from '@/src/components/shared';
import { JourneysService } from '@/src/services/journeys';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useTheme } from '@/src/theme';
import { BucketItem } from '@/src/types/item';
import { Journey } from '@/src/types/social';
import { useFocusEffect, useRouter } from 'expo-router';
import { MessageCircle, Search, Users } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JourneysScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { items } = useBucketStore();
    const [activeTab, setActiveTab] = useState<'my-journeys' | 'explore'>('my-journeys');
    const [openJourneys, setOpenJourneys] = useState<Journey[]>([]);
    const [joinedJourneys, setJoinedJourneys] = useState<Journey[]>([]);
    const [isLoadingExplore, setIsLoadingExplore] = useState(false);
    const [isFetchingMoreExplore, setIsFetchingMoreExplore] = useState(false);
    const [hasMoreExplore, setHasMoreExplore] = useState(true);
    const [openJourneysCursor, setOpenJourneysCursor] = useState<any>(null);
    const [isLoadingMyJourneys, setIsLoadingMyJourneys] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Filter "My Journeys" from local store (Owned Dreams)
    // We only care about dreams I OWN here. Joined dreams come from separate state.
    const myOwnedJourneys = useMemo(() =>
        items.filter(i => i.collaborationType === 'group' || i.collaborationType === 'open'),
        [items]);

    // Helper to Convert Journey Preview to Partial BucketItem for Card (Visuals only)
    const journeyToItem = (journey: Journey): BucketItem => {
        return {
            id: journey.dreamId,
            title: journey.preview?.title || 'Unknown Dream',
            description: journey.preview?.description,
            mainImage: journey.preview?.image,
            userId: journey.ownerId,
            phase: 'dream', // Usually 'doing' for journeys but defaults to dream for list
            category: 'other',
            createdAt: journey.createdAt,
            updatedAt: journey.createdAt,
            status: 'active',
            isPublic: true,
            commentsCount: 0,
            likesCount: 0,
            collaborationType: 'group' // It is a group journey
        } as BucketItem;
    };

    // Combine Owned + Joined
    const allMyJourneys = useMemo(() => {
        // Convert joined journeys to BucketItems for display
        const joinedItems = joinedJourneys.map(j => journeyToItem(j));

        // Merge arrays (deduping by ID just in case)
        const all = [...myOwnedJourneys];
        joinedItems.forEach(jItem => {
            if (!all.find(existing => existing.id === jItem.id)) {
                all.push(jItem);
            }
        });
        return all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [myOwnedJourneys, joinedJourneys]);


    const fetchJoinedJourneys = useCallback(async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        // We only show loader if we don't have owned journeys to show immediately
        // or we can show a small refresher. For now, specific loading state.
        if (myOwnedJourneys.length === 0) setIsLoadingMyJourneys(true);

        try {
            const results = await JourneysService.getUserJourneys(userId);
            // Filter out journeys where I am the OWNER (already covered by myOwnedJourneys from store)
            // ensuring no duplicates if store sync is slow or logic overlaps
            const joinedOnly = results.filter(j => j.ownerId !== userId);
            setJoinedJourneys(joinedOnly);
        } catch (error) {
            console.error('Failed to fetch user journeys', error);
        } finally {
            setIsLoadingMyJourneys(false);
            setRefreshing(false);
        }
    }, [myOwnedJourneys.length]);

    const fetchOpenJourneys = useCallback(async (loadMore: boolean = false) => {
        if (loadMore) {
            if (isFetchingMoreExplore || !hasMoreExplore) return;
            setIsFetchingMoreExplore(true);
        } else {
            setIsLoadingExplore(true);
        }

        try {
            const page = await JourneysService.getOpenJourneysPaginated(
                12,
                loadMore ? openJourneysCursor : null
            );
            const currentUserId = auth.currentUser?.uid;

            // Filter out my own dreams OR dreams I'm already participating in
            const filtered = page.journeys.filter(j =>
                j.ownerId !== currentUserId &&
                !j.participants.includes(currentUserId || '')
            );

            setOpenJourneys(prev =>
                loadMore
                    ? [...prev, ...filtered.filter(next => !prev.some(existing => existing.id === next.id))]
                    : filtered
            );
            setOpenJourneysCursor(page.lastDoc);
            setHasMoreExplore(page.hasMore);
        } catch (error) {
            console.error('Failed to fetch open journeys', error);
        } finally {
            setIsLoadingExplore(false);
            setIsFetchingMoreExplore(false);
            setRefreshing(false);
        }
    }, [hasMoreExplore, isFetchingMoreExplore, openJourneysCursor]);

    useFocusEffect(
        useCallback(() => {
            if (activeTab === 'my-journeys') {
                fetchJoinedJourneys();
            } else {
                fetchOpenJourneys();
            }
        }, [activeTab, fetchJoinedJourneys, fetchOpenJourneys])
    );

    const onRefresh = () => {
        setRefreshing(true);
        if (activeTab === 'explore') {
            fetchOpenJourneys();
        } else {
            fetchJoinedJourneys();
            // Store sync happens globally, but we could trigger it if we had a manual sync method
        }
    };

    const handlePress = (itemId: string) => {
        router.push(`/item/${itemId}`);
    };

    const handlePressJourney = (journey: Journey) => {
        router.push(`/item/${journey.dreamId}`);
    };

    const data = activeTab === 'my-journeys' ? allMyJourneys : openJourneys;

    const renderJourneyItem = ({ item }: { item: BucketItem | Journey }) => {
        if (activeTab === 'my-journeys') {
            const dreamItem = item as BucketItem;
            const linkedJourney = joinedJourneys.find(j => j.dreamId === dreamItem.id);
            const cardUser = linkedJourney ? {
                id: linkedJourney.ownerId,
                displayName: linkedJourney.preview?.authorName || 'Unknown',
                avatar: linkedJourney.preview?.authorAvatar || '',
                email: '', bio: '', publicDreamsCount: 0, completedDreamsCount: 0, createdAt: 0
            } : undefined;

            return (
                <DreamCard
                    item={dreamItem}
                    onPress={() => dreamItem.userId === auth.currentUser?.uid ? handlePress(dreamItem.id) : handlePressJourney(linkedJourney as Journey)}
                    user={cardUser}
                    showUser={!!cardUser}
                />
            );
        }

        const journey = item as Journey;
        return (
            <DreamCard
                item={journeyToItem(journey)}
                onPress={() => handlePressJourney(journey)}
                user={{
                    displayName: journey.preview?.authorName || 'User',
                    avatar: journey.preview?.authorAvatar || '',
                    id: journey.ownerId,
                    email: '',
                    bio: '',
                    publicDreamsCount: 0,
                    completedDreamsCount: 0,
                    createdAt: 0
                }}
                showUser={true}
            />
        );
    };

    const renderEmpty = () => {
        if (activeTab === 'my-journeys') {
            if (isLoadingMyJourneys) return <BucketLoaderInline message="Loading your journeys..." />;
            return (
                <View style={styles.emptyContainer}>
                    <EmptyState
                        icon={Users}
                        title="No Journeys Yet"
                        description="Start a journey by inviting friends to your dreams, or join an open dream."
                        action={{
                            label: "Create a Dream",
                            onPress: () => router.push('/item/add')
                        }}
                    />
                </View>
            );
        }

        if (isLoadingExplore) return <BucketLoaderInline message="Discovering journeys..." />;
        return (
            <View style={styles.emptyContainer}>
                <EmptyState
                    icon={Search}
                    title="No Open Journeys"
                    description="There are no open journeys to join right now. Check back later or start your own!"
                />
            </View>
        );
    };

    const renderFooter = () => {
        if (activeTab !== 'explore' || !isFetchingMoreExplore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    };



    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Journeys</Text>
                    <NotificationBell />
                </View>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Chasing Dreams Together
                </Text>
            </View>

            {/* Tab Toggle */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'my-journeys' && styles.activeTab, { borderColor: activeTab === 'my-journeys' ? colors.primary : 'transparent' }]}
                    onPress={() => setActiveTab('my-journeys')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'my-journeys' ? colors.primary : colors.textSecondary }]}>My Journeys</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'explore' && styles.activeTab, { borderColor: activeTab === 'explore' ? colors.primary : 'transparent' }]}
                    onPress={() => setActiveTab('explore')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'explore' ? colors.primary : colors.textSecondary }]}>Explore</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={data as any[]}
                renderItem={renderJourneyItem as any}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                onEndReachedThreshold={0.45}
                onEndReached={() => {
                    if (activeTab === 'explore' && hasMoreExplore && !isLoadingExplore && !isFetchingMoreExplore) {
                        fetchOpenJourneys(true);
                    }
                }}
            />

            {/* Global Chat Floating Action Button */}
            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/chat')}
                >
                    <MessageCircle color="white" size={28} />
                </TouchableOpacity>
            </View>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 16,
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 20
    },
    tab: {
        paddingBottom: 8,
        borderBottomWidth: 2,
    },
    activeTab: {

    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    emptyContainer: {
        marginTop: 40,
    },
    footerLoader: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
