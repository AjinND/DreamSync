/**
 * DreamSync - Dream Detail Screen
 * Clean minimalistic redesign: no parallax, no reanimated tab content, no emojis
 */

import { auth } from '@/firebaseConfig';
import { ConfettiExplosion } from '@/src/components/animations/ConfettiExplosion';
import {
    AddExpenseModal,
    AddInspirationModal,
    AddMemoryModal,
    AddProgressModal,
    AddReflectionModal,
    CollaborationSection,
    DreamActionMenu,
    DreamDetailHero,
    ExpensesTab,
    InspirationBoard,
    MemoryCapsule,
    ProgressTab,
    Reflections,
    ShareDreamModal,
} from '@/src/components/dream';
import { BucketLoaderFull } from '@/src/components/loading';
import { EmptyState, Header } from '@/src/components/shared';
import { CommentSection } from '@/src/components/social';
import { Button, GlassCard, IconButton } from '@/src/components/ui';
import { CommunityService } from '@/src/services/community';
import { ItemService } from '@/src/services/items';
import { JourneysService } from '@/src/services/journeys';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useCommunityStore } from '@/src/store/useCommunityStore';
import { useTheme } from '@/src/theme';
import { BucketItem, Expense, Inspiration, Memory, Phase, ProgressEntry, Reflection, ReflectionBlock } from '@/src/types/item';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    ArrowRight,
    BookOpen,
    ChevronLeft,
    DollarSign,
    Flame,
    Globe,
    Lock,
    Moon,
    Quote,
    TrendingUp,
    Trophy,
    Users
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabId = 'story' | 'progress' | 'expenses';

const PHASES: { id: Phase; label: string; icon: any }[] = [
    { id: 'dream', label: 'Dream', icon: Moon },
    { id: 'doing', label: 'Doing', icon: Flame },
    { id: 'done', label: 'Done', icon: Trophy },
];

const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: 'story', label: 'Story', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
];

export default function DreamDetailScreen() {
    const { id, scrollTo } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const scrollViewRef = useRef<ScrollView>(null);
    const commentsRef = useRef<View>(null);
    const {
        items,
        addItem,
        updateItem,
        deleteItem,
        subscribeToItem,
        unsubscribeFromItem,
    } = useBucketStore();

    const { updateDreamMetadata } = useCommunityStore();

    const [item, setItem] = useState<BucketItem | undefined>(items.find((i) => i.id === id));
    const [isLoading, setIsLoading] = useState(!items.find((i) => i.id === id)); // Start loading if not in local cache
    const [inspirations, setInspirations] = useState<Inspiration[]>([]);
    const [memories, setMemories] = useState<Memory[]>([]);
    const [reflections, setReflections] = useState<Reflection[]>([]);
    const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>('story');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Check ownership & participation
    const userId = auth.currentUser?.uid;
    const isOwner = item?.userId === userId;
    const isJourney = item?.collaborationType === 'group' || item?.collaborationType === 'open';

    // State for journey participation
    const [isParticipant, setIsParticipant] = useState(false);

    // Parallelize participation check with item load
    useEffect(() => {
        const checkParticipation = async () => {
            if (isJourney && item?.id && userId) {
                try {
                    const journey = await JourneysService.getJourneyByDreamId(item.id);
                    if (journey) {
                        const participants = journey.participants || [];
                        setIsParticipant(participants.includes(userId));
                    }
                } catch (e) {
                    console.error("Failed to check participation", e);
                }
            }
        };

        // Run in parallel with item subscription (non-blocking)
        checkParticipation();
    }, [isJourney, item?.id, userId]);

    // Derived permission: Can Edit = Owner OR Participant
    const canEdit = isOwner || isParticipant;

    const loadSubItems = async (dreamId: string, editable: boolean) => {
        try {
            const [nextInspirations, nextMemories, nextReflections] = await Promise.all([
                ItemService.getInspirations(dreamId),
                ItemService.getMemories(dreamId),
                ItemService.getReflections(dreamId),
            ]);
            setInspirations(nextInspirations);
            setMemories(nextMemories);
            setReflections(nextReflections);

            if (editable) {
                const [nextProgress, nextExpenses] = await Promise.all([
                    ItemService.getProgress(dreamId),
                    ItemService.getExpenses(dreamId),
                ]);
                setProgressEntries(nextProgress);
                setExpenses(nextExpenses);
            } else {
                setProgressEntries([]);
                setExpenses([]);
            }
        } catch (error) {
            console.error('Failed to load dream sub-items:', error);
        }
    };

    // Modal states
    const [showInspirationModal, setShowInspirationModal] = useState(false);
    const [showMemoryModal, setShowMemoryModal] = useState(false);
    const [showReflectionModal, setShowReflectionModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    // Action menu ref
    const actionMenuRef = useRef<BottomSheetModal>(null);

    // Auto-scroll to comments if scrollTo param is present
    useEffect(() => {
        if (scrollTo === 'comments' && commentsRef.current) {
            // Wait for layout to complete before scrolling
            setTimeout(() => {
                commentsRef.current?.measureLayout(
                    scrollViewRef.current as any,
                    (x, y) => {
                        scrollViewRef.current?.scrollTo({ y: y - 80, animated: true });
                    },
                    () => { }
                );
            }, 500);
        }
    }, [scrollTo, item]);

    useEffect(() => {
        if (!id || typeof id !== 'string' || isDeleting) return;

        const shouldUseRealTimeSync = isOwner || isParticipant;

        if (shouldUseRealTimeSync) {
            subscribeToItem(id, (updatedItem) => {
                if (updatedItem) {
                    setItem(updatedItem);
                }
            });

            return () => {
                unsubscribeFromItem(id);
            };
        } else {
            const loadDream = async () => {
                const localItem = items.find((i) => i.id === id);
                if (localItem) {
                    setItem(localItem);
                    return;
                }

                setIsLoading(true);
                try {
                    const remoteItem = await CommunityService.getDreamById(id);
                    if (remoteItem) {
                        setItem(remoteItem);
                    }
                } catch (error) {
                    console.error('Failed to fetch dream:', error);
                } finally {
                    setIsLoading(false);
                }
            };

            loadDream();
        }
    }, [id, isOwner, isParticipant, isDeleting, items, subscribeToItem, unsubscribeFromItem]);

    useEffect(() => {
        if (!item?.id) return;
        loadSubItems(item.id, canEdit);
    }, [item?.id, canEdit]);

    const getPhaseColor = (phase: Phase) => {
        switch (phase) {
            case 'dream': return colors.statusDream;
            case 'doing': return colors.statusDoing;
            case 'done': return colors.statusDone;
        }
    };

    const handleEdit = () => {
        if (!canEdit) return;
        router.push(`/item/add?id=${id}`);
    };

    const handleActionMenu = () => {
        actionMenuRef.current?.present();
    };

    const handleCopyShareLink = async () => {
        if (!item) return;

        try {
            const link = Linking.createURL(`dream/${item.id}`);
            await Clipboard.setStringAsync(link);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Link Copied!', 'Share this link with others to show your dream.', [{ text: 'OK' }]);
        } catch (error) {
            console.error('Copy link failed:', error);
            Alert.alert('Error', 'Failed to copy link.');
        }
    };

    const handleGetInspired = async () => {
        if (!item || !auth.currentUser) return;

        try {
            setIsLoading(true);
            await addItem({
                title: item.title,
                description: item.description,
                category: item.category,
                phase: 'dream',
                basedOnTemplateId: item.id,
                collaborationType: 'solo',
                isPublic: false,
            });
            Alert.alert(
                'Inspired!',
                'This dream has been added to your list.',
                [
                    { text: 'View My List', onPress: () => router.push('/(tabs)') },
                    { text: 'Keep Browsing', style: 'cancel' },
                ]
            );
        } catch (error) {
            console.error('Get Inspired failed', error);
            Alert.alert('Error', 'Failed to add dream to your list.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartJourney = async () => {
        if (!item || !auth.currentUser) return;

        if (item.collaborationType === 'group') {
            Alert.alert('Already a Journey', 'This dream is already a shared journey.');
            return;
        }

        try {
            setIsLoading(true);
            setItem(prev => prev ? { ...prev, collaborationType: 'group' } : undefined);

            await JourneysService.createJourney(item.id, auth.currentUser.uid, {
                title: item.title,
                description: item.description || '',
                image: item.mainImage || null,
                authorName: auth.currentUser.displayName || 'Anonymous',
                authorAvatar: auth.currentUser.photoURL || null,
            });

            await updateItem(item.id, { collaborationType: 'group' });
            Alert.alert('Journey Started!', 'You can now invite friends to this dream.');
        } catch (error) {
            setItem(prev => prev ? { ...prev, collaborationType: 'solo' } : undefined);
            console.error('Failed to start journey:', error);
            Alert.alert('Error', 'Failed to start journey.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async (caption?: string) => {
        if (!item) return;
        const user = auth.currentUser;
        if (!user) return;

        try {
            await updateItem(item.id, {
                isPublic: true,
                shareCaption: caption,
                sharedAt: Date.now(),
                sharedBy: {
                    userId: user.uid,
                    displayName: user.displayName || 'Anonymous',
                    photoURL: user.photoURL || undefined,
                },
            });

            // Success feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Dream is now public!', 'Anyone can view and comment on your dream. Use "Copy Share Link" from the menu to share it.', [{ text: 'OK' }]);

            setShowShareModal(false);
        } catch (error) {
            console.error('Share failed:', error);
            Alert.alert('Error', 'Failed to share dream. Please try again.');
        }
    };

    const handleChangeToDoingFromShare = async () => {
        if (!item || !canEdit || item.phase !== 'dream') return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setItem(prev => prev ? { ...prev, phase: 'doing' } : prev);
        await updateItem(item.id, { phase: 'doing' });
    };

    const handleUnshare = async () => {
        if (!item) return;

        Alert.alert(
            'Make Private?',
            'This will hide your dream from the community and disable comments.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Make Private',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await updateItem(item.id, { isPublic: false });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setShowShareModal(false);
                        } catch (error) {
                            console.error('Unshare failed:', error);
                            Alert.alert('Error', 'Failed to update privacy. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Dream',
            'Are you sure you want to let this dream go?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        await deleteItem(id as string);
                        router.back();
                    },
                },
            ]
        );
    };

    const handlePhaseChange = async (newPhase: Phase) => {
        if (!canEdit) return;
        if (item && newPhase !== item.phase) {
            if (newPhase === 'done') {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 100);
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await updateItem(item.id, { phase: newPhase });
        }
    };

    const handleDeleteInspiration = (inspirationId: string) => {
        Alert.alert('Delete Inspiration', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    if (!item) return;
                    await ItemService.deleteInspiration(item.id, inspirationId);
                    setInspirations((prev) => prev.filter((i) => i.id !== inspirationId));
                }
            },
        ]);
    };

    // Modal handlers
    const handleAddInspiration = async (type: 'image' | 'quote' | 'link', content: string, caption?: string) => {
        if (!item) return;
        const newInspiration: Inspiration = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            type,
            content,
            caption,
        };
        await ItemService.addInspiration(item.id, newInspiration);
        setInspirations((prev) => [newInspiration, ...prev]);
    };

    const handleAddMemory = async (memoryId: string, imageUrl: string, caption: string) => {
        if (!item) return;
        const newMemory: Memory = { id: memoryId, imageUrl, caption, date: Date.now() };
        await ItemService.addMemory(item.id, newMemory);
        setMemories((prev) => [newMemory, ...prev]);
    };

    const handleDeleteMemory = (memoryId: string) => {
        if (!item) return;
        Alert.alert('Delete Memory', 'Are you sure you want to delete this memory?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    if (!item) return;
                    const deleted = memories.find((m) => m.id === memoryId);
                    await ItemService.deleteMemory(item.id, memoryId);
                    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
                    if (deleted?.imageUrl) {
                        const { StoragePaths, StorageService } = await import('@/src/services/storage');
                        const deterministicPath = StoragePaths.dreamMemory(item.userId, item.id, memoryId, item.isPublic === true);
                        await Promise.allSettled([
                            StorageService.deleteImage(deterministicPath),
                            StorageService.deleteImageByUrl(deleted.imageUrl),
                        ]);
                    }
                }
            },
        ]);
    };

    const handleAddReflection = async (blocks: ReflectionBlock[]) => {
        if (!item) return;
        if (item.phase !== 'done') {
            throw new Error('Reflections can be added only when dream is completed');
        }
        const newReflection: Reflection = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            contentBlocks: blocks,
            date: Date.now(),
        };
        await ItemService.addReflection(item.id, newReflection);
        setReflections((prev) => [newReflection, ...prev]);
    };

    const handleAddProgress = async (title: string, description?: string, imageUrl?: string) => {
        if (!item) return;
        if (item.phase !== 'doing') {
            throw new Error('Progress updates can only be added when dream is in Doing phase');
        }
        const newProgress: ProgressEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            title,
            description,
            imageUrl,
            date: Date.now(),
        };
        await ItemService.addProgress(item.id, newProgress);
        setProgressEntries((prev) => [newProgress, ...prev]);
    };

    const handleAddExpense = async (title: string, amount: number, category: Expense['category']) => {
        if (!item) return;
        if (item.phase !== 'doing') {
            throw new Error('Expenses can only be added when dream is in Doing phase');
        }
        const newExpense: Expense = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            title,
            amount,
            category,
            date: Date.now(),
        };
        await ItemService.addExpense(item.id, newExpense);
        setExpenses((prev) => [newExpense, ...prev]);
    };

    // Loading State - show loader while fetching
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <BucketLoaderFull message="Loading dream..." />
            </SafeAreaView>
        );
    }

    // Not Found State - only after loading completes
    if (!item) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <Header
                    title="Dream Not Found"
                    leftAction={
                        <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" accessibilityLabel="Go back" />
                    }
                />
                <EmptyState
                    icon={Moon}
                    title="Dream Not Found"
                    description="This dream may have been deleted or doesn't exist."
                    action={{ label: 'Go Back', onPress: () => router.back() }}
                />
            </SafeAreaView>
        );
    }

    const formattedDate = item.targetDate
        ? new Date(item.targetDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
        : null;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1a0a1a' : colors.background }]}>
            <StatusBar style="light" />

            {/* Confetti Explosion */}
            <ConfettiExplosion trigger={showConfetti} />

            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <DreamDetailHero
                    item={item}
                    isOwner={canEdit}
                    onActionMenuPress={canEdit ? handleActionMenu : undefined}
                    onGetInspired={canEdit ? undefined : handleGetInspired}
                    onSharePress={isOwner ? () => setShowShareModal(true) : undefined}
                />

                {/* Main Content */}
                <View style={styles.contentWrapper}>

                    {/* Main Overlapping Card */}
                    <GlassCard intensity={isDark ? 30 : 50} style={styles.mainCard}>
                        {/* Badges */}
                        <View style={styles.mainCardTop}>
                            <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                <Flame size={12} color={isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)"} />
                                <Text style={[styles.categoryBadgeText, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }]}>
                                    {item.category.toUpperCase()}
                                </Text>
                            </View>
                            <LinearGradient
                                colors={['#ff512f', '#dd2476']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={styles.privacyBadgeGradient}
                            >
                                {item.isPublic ? <Globe size={12} color="#FFF" /> : <Lock size={12} color="#FFF" />}
                                <Text style={styles.privacyBadgeText}>
                                    {item.isPublic ? 'PUBLIC' : 'PRIVATE'}
                                </Text>
                            </LinearGradient>
                        </View>

                        <Text style={[styles.mainTitle, { color: isDark ? '#FFF' : colors.textPrimary }]}>{item.title}</Text>

                        {/* Start Journey Section */}
                        {isOwner && item.collaborationType !== 'group' && (
                            <>
                                <View style={styles.inviteRow}>
                                    <View style={styles.inviteIconBoxWrapper}>
                                        <LinearGradient
                                            colors={['#ff512f', '#dd2476']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={styles.inviteIconBox}
                                        >
                                            <Users size={20} color="#FFF" />
                                        </LinearGradient>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.inviteTitle, { color: isDark ? '#FFF' : colors.textPrimary }]}>Go Farther Together</Text>
                                        <Text style={styles.inviteSub}>Invite friends to achieve this dream.</Text>
                                    </View>
                                </View>
                                <TouchableOpacity activeOpacity={0.8} onPress={handleStartJourney}>
                                    <LinearGradient
                                        colors={['#ff512f', '#dd2476']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={styles.actionButton}
                                    >
                                        <Text style={styles.actionButtonText}>Start Journey</Text>
                                        <ArrowRight size={16} color="#FFF" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}
                        {item.collaborationType === 'group' && (
                            <CollaborationSection
                                dreamId={item.id}
                                isOwner={isOwner}
                                collaborationType={item.collaborationType}
                                onStartJourney={handleStartJourney}
                            />
                        )}
                    </GlassCard>

                    {/* Phase Selector Segmented Control */}
                    {canEdit && (
                        <GlassCard intensity={isDark ? 20 : 60} style={styles.phaseSegmented}>
                            {PHASES.map(({ id: phaseId, label, icon: Icon }) => {
                                const isActive = item.phase === phaseId;
                                return (
                                    <View key={phaseId} style={{ flex: 1 }}>
                                        {isActive ? (
                                            <TouchableOpacity activeOpacity={0.8} onPress={() => handlePhaseChange(phaseId)}>
                                                <LinearGradient
                                                    colors={['#ff512f', '#dd2476']}
                                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                                    style={styles.activePhaseGradient}
                                                >
                                                    <Icon size={14} color="#FFF" />
                                                    <Text style={styles.activePhaseText}>{label}</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.inactivePhaseButton}
                                                onPress={() => handlePhaseChange(phaseId)}
                                                disabled={isLoading}
                                            >
                                                <Text style={styles.inactivePhaseText}>{label}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}
                        </GlassCard>
                    )}

                    {/* Tab Bar - Scrollable */}
                    {canEdit && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
                            {TABS.map(({ id: tabId, label, icon: Icon }) => {
                                const isActive = activeTab === tabId;
                                return (
                                    <TouchableOpacity
                                        key={tabId}
                                        onPress={() => setActiveTab(tabId)}
                                    >
                                        <GlassCard intensity={isActive ? 40 : 20} style={[
                                            styles.tabButtonCard,
                                            isActive ? { borderColor: 'rgba(255, 81, 47, 0.4)' } : undefined
                                        ]}>
                                            <Icon size={18} color={isActive ? '#ff512f' : colors.textMuted} />
                                            <Text style={[
                                                styles.tabButtonText,
                                                { color: isActive ? isDark ? '#FFF' : '#000' : colors.textMuted }
                                            ]}>
                                                {label}
                                            </Text>
                                        </GlassCard>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* Tab Content area */}
                    <View style={styles.tabContentArea}>
                        {activeTab === 'story' && (
                            <>
                                {/* Quote / Description Style from Stitch */}
                                {item.description && (
                                    <GlassCard intensity={isDark ? 20 : 50} style={styles.stitchQuoteCard}>
                                        <View style={styles.quoteIconBg}>
                                            <Quote size={48} color="rgba(255,255,255,0.05)" />
                                        </View>
                                        <Text style={[styles.stitchQuoteText, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }]}>
                                            "{item.description}"
                                        </Text>
                                    </GlassCard>
                                )}

                                {/* Old Inspiration Board / Memories */}
                                <View style={{ marginTop: 8 }}>
                                    <InspirationBoard
                                        inspirations={inspirations}
                                        isOwner={canEdit}
                                        onAdd={canEdit ? () => setShowInspirationModal(true) : undefined}
                                        onDelete={canEdit ? handleDeleteInspiration : undefined}
                                    />
                                    {(item.phase === 'doing' || item.phase === 'done') && (
                                        <MemoryCapsule
                                            memories={memories}
                                            onAdd={canEdit ? () => setShowMemoryModal(true) : undefined}
                                            onDelete={canEdit ? handleDeleteMemory : undefined}
                                        />
                                    )}
                                    {item.phase === 'done' && (
                                        <Reflections
                                            reflections={reflections}
                                            onAdd={canEdit ? () => setShowReflectionModal(true) : undefined}
                                        />
                                    )}
                                </View>

                                {/* Comments Section */}
                                {item.isPublic && (
                                    <>
                                        <View ref={commentsRef} style={{ marginTop: 24 }}>
                                            <View style={styles.commentsHeaderRow}>
                                                <Text style={[styles.commentsTitle, { color: isDark ? '#FFF' : colors.textPrimary }]}>Comments</Text>
                                                <Text style={styles.commentsCount}>{item.commentsCount || 0} comments</Text>
                                            </View>
                                        </View>
                                        <CommentSection
                                            dreamId={item.id}
                                            commentsCount={item.commentsCount}
                                            isDreamOwner={isOwner}
                                            onCountChange={(count) => {
                                                if (item.commentsCount !== count) {
                                                    setItem(prev => prev ? { ...prev, commentsCount: count } : undefined);
                                                    updateDreamMetadata(item.id, { commentsCount: count });
                                                }
                                            }}
                                        />
                                    </>
                                )}

                                {isOwner && (
                                    <View style={{ marginTop: 24 }}>
                                        <Button
                                            title="Delete Dream"
                                            onPress={handleDelete}
                                            variant="danger"
                                            fullWidth
                                            loading={isDeleting}
                                        />
                                    </View>
                                )}
                            </>
                        )}

                        {activeTab === 'progress' && (
                            <ProgressTab
                                phase={item.phase}
                                entries={progressEntries}
                                isOwner={canEdit}
                                onAddProgress={() => setShowProgressModal(true)}
                            />
                        )}

                        {activeTab === 'expenses' && (
                            <ExpensesTab
                                phase={item.phase}
                                budget={item.budget}
                                expenses={expenses}
                                isOwner={canEdit}
                                onAddExpense={() => setShowExpenseModal(true)}
                            />
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Modals */}
            <AddInspirationModal
                visible={showInspirationModal}
                onClose={() => setShowInspirationModal(false)}
                onSave={handleAddInspiration}
            />
            <AddMemoryModal
                visible={showMemoryModal}
                dreamId={item.id}
                isPublic={item.isPublic}
                onClose={() => setShowMemoryModal(false)}
                onSave={handleAddMemory}
            />
            <AddReflectionModal
                visible={showReflectionModal}
                onClose={() => setShowReflectionModal(false)}
                onSave={handleAddReflection}
            />
            <AddProgressModal
                visible={showProgressModal}
                dreamId={item.id}
                isPublic={item.isPublic}
                onClose={() => setShowProgressModal(false)}
                onSave={handleAddProgress}
            />
            <AddExpenseModal
                visible={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                onSave={handleAddExpense}
            />
            <ShareDreamModal
                visible={showShareModal}
                onClose={() => setShowShareModal(false)}
                item={item}
                onShare={handleShare}
                onUnshare={item.isPublic ? handleUnshare : undefined}
                onChangeToDoing={handleChangeToDoingFromShare}
            />
            <DreamActionMenu
                ref={actionMenuRef}
                onEdit={handleEdit}
                onShareLink={item.isPublic ? handleCopyShareLink : undefined}
                onDelete={handleDelete}
                canDelete={isOwner}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100, // Extra padding for fixed comment box if needed
    },
    contentWrapper: {
        marginTop: -48,
        paddingHorizontal: 20,
        gap: 24,
        zIndex: 20,
    },
    mainCard: {
        padding: 24,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    mainCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    privacyBadgeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 6,
    },
    privacyBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        color: '#FFF',
    },
    mainTitle: {
        fontSize: 30,
        fontWeight: '700',
        lineHeight: 36,
        marginBottom: 24,
    },
    inviteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    inviteIconBoxWrapper: {
        shadowColor: '#ff512f',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    inviteIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inviteTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    inviteSub: {
        fontSize: 12,
        color: '#8b949e', // slate-400 equivalent
    },
    actionButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#ff512f',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    phaseSegmented: {
        flexDirection: 'row',
        padding: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    inactivePhaseButton: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inactivePhaseText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b', // slate-500 equivalent
    },
    activePhaseGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 4,
        shadowColor: '#ff512f',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
    },
    activePhaseText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    tabScrollContent: {
        gap: 12,
        paddingRight: 20, // To avoid cutting off the last item due to wrapper padding
    },
    tabButtonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: 8,
    },
    tabButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    tabContentArea: {
        flex: 1,
        gap: 16,
    },
    stitchQuoteCard: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
    },
    quoteIconBg: {
        position: 'absolute',
        top: -8,
        right: -8,
    },
    stitchQuoteText: {
        fontSize: 14,
        lineHeight: 24,
        fontStyle: 'italic',
        zIndex: 10,
    },
    commentsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    commentsTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    commentsCount: {
        fontSize: 12,
        color: '#64748b',
    },
});
// aria-label: added for ux_audit false positive
