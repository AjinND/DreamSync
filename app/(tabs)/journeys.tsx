/**
 * DreamSync - Journeys Tab (Placeholder)
 * Shared dreams, collaboration, group journeys
 */

import { auth } from '@/firebaseConfig'; // Added import
import { DreamCard } from '@/src/components/dream/DreamCard';
import { EmptyState, NotificationBell } from '@/src/components/shared';
import { BucketLoaderInline } from '@/src/components/loading';
import { JourneysService } from '@/src/services/journeys';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useTheme } from '@/src/theme';
import { BucketItem } from '@/src/types/item';
import { Journey } from '@/src/types/social';
import { useFocusEffect, useRouter } from 'expo-router';
import { MessageCircle, Search, Users } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JourneysScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { items } = useBucketStore();
    const [activeTab, setActiveTab] = useState<'my-journeys' | 'explore'>('my-journeys');
    const [openJourneys, setOpenJourneys] = useState<Journey[]>([]);
    const [joinedJourneys, setJoinedJourneys] = useState<Journey[]>([]);
    const [isLoadingExplore, setIsLoadingExplore] = useState(false);
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


    useFocusEffect(
        useCallback(() => {
            if (activeTab === 'my-journeys') {
                fetchJoinedJourneys();
            } else {
                fetchOpenJourneys();
            }
        }, [activeTab])
    );

    const fetchJoinedJourneys = async () => {
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
    };

    const fetchOpenJourneys = async () => {
        setIsLoadingExplore(true);
        try {
            const results = await JourneysService.getOpenJourneys();
            const currentUserId = auth.currentUser?.uid;

            // Filter out my own dreams OR dreams I'm already participating in
            const filtered = results.filter(j =>
                j.ownerId !== currentUserId &&
                !j.participants.includes(currentUserId || '')
            );

            setOpenJourneys(filtered);
        } catch (error) {
            console.error('Failed to fetch open journeys', error);
        } finally {
            setIsLoadingExplore(false);
            setRefreshing(false);
        }
    };

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



    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Journeys</Text>
                    <NotificationBell />
                </View>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Dreams you're achieving together
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

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {activeTab === 'my-journeys' ? (
                    <>
                        {isLoadingMyJourneys ? (
                            <BucketLoaderInline message="Loading your journeys..." />
                        ) : allMyJourneys.length > 0 ? (
                            <View style={styles.grid}>
                                {allMyJourneys.map(item => {
                                    // Logic to find journey metadata for "My Journeys" list (optional, but good for avatar)
                                    // For owned items, we have owner details in store or auth.
                                    // For joined items, we might need author details which are in 'preview' if we used journeyToItem.
                                    // Wait, DreamCard needs 'user' object.

                                    // Check if it's a joined journey to pass correct author
                                    const linkedJourney = joinedJourneys.find(j => j.dreamId === item.id);

                                    // Construct user object for card
                                    const cardUser = linkedJourney ? {
                                        id: linkedJourney.ownerId,
                                        displayName: linkedJourney.preview?.authorName || 'Unknown',
                                        avatar: linkedJourney.preview?.authorAvatar || '',
                                        email: '', bio: '', publicDreamsCount: 0, completedDreamsCount: 0, createdAt: 0
                                    } : undefined; // Default will fall back to item.userId logic in DreamCard or we assume owned

                                    return (
                                        <DreamCard
                                            key={item.id}
                                            item={item}
                                            onPress={() => item.userId === auth.currentUser?.uid ? handlePress(item.id) : handlePressJourney(linkedJourney as Journey)}
                                            user={cardUser}
                                            showUser={!!cardUser} // Show user if it's someone else's dream
                                        />
                                    );
                                })}
                            </View>
                        ) : (
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
                        )}
                    </>
                ) : (
                    <>
                        {isLoadingExplore ? (
                            <BucketLoaderInline message="Discovering journeys..." />
                        ) : (
                            <>
                                {openJourneys.length > 0 ? (
                                    <View style={styles.grid}>
                                        {openJourneys.map(journey => (
                                            <DreamCard
                                                key={journey.id}
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
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyContainer}>
                                        <EmptyState
                                            icon={Search}
                                            title="No Open Journeys"
                                            description="There are no open journeys to join right now. Check back later or start your own!"
                                        />
                                    </View>
                                )}
                            </>
                        )}
                    </>
                )}
            </ScrollView>

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
        paddingBottom: 40,
    },
    grid: {
        paddingHorizontal: 16,
        gap: 16,
    },
    emptyContainer: {
        marginTop: 40,
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
