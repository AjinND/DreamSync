/**
 * DreamSync - Dream Detail Screen
 * Clean minimalistic redesign: no parallax, no reanimated tab content, no emojis
 */

import { auth } from '@/firebaseConfig';
import {
    AddExpenseModal,
    AddInspirationModal,
    AddMemoryModal,
    AddProgressModal,
    AddReflectionModal,
    CollaborationSection,
    DreamDetailHero,
    ExpensesTab,
    InspirationBoard,
    MemoryCapsule,
    ProgressTab,
    Reflections,
} from '@/src/components/dream';
import { ConfettiExplosion } from '@/src/components/animations/ConfettiExplosion';
import { EmptyState, Header } from '@/src/components/shared';
import { CommentSection } from '@/src/components/social';
import { Button, Card, IconButton } from '@/src/components/ui';
import { CommunityService } from '@/src/services/community';
import { JourneysService } from '@/src/services/journeys';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useCommunityStore } from '@/src/store/useCommunityStore';
import { useTheme } from '@/src/theme';
import { BucketItem, Expense, Phase, ReflectionBlock } from '@/src/types/item';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    BookOpen,
    Calendar,
    ChevronLeft,
    DollarSign,
    Flame,
    MapPin,
    Moon,
    TrendingUp,
    Trophy,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const {
        items,
        addItem,
        updateItem,
        deleteItem,
        addInspiration,
        deleteInspiration,
        addMemory,
        deleteMemory,
        addReflection,
        addProgress,
        addExpense,
        subscribeToItem,
        unsubscribeFromItem,
    } = useBucketStore();

    const { updateDreamMetadata } = useCommunityStore();

    const [item, setItem] = useState<BucketItem | undefined>(items.find((i) => i.id === id));
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('story');
    const [isDeleting, setIsDeleting] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);
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
            if (isJourney && item && userId) {
                try {
                    const journey = await JourneysService.getJourneyByDreamId(item.id);
                    if (journey) {
                        const participants = journey.participants || [];
                        setIsParticipant(participants.includes(userId));
                        setChatId(`journey_${journey.id}`);
                    }
                } catch (e) {
                    console.error("Failed to check participation", e);
                }
            }
        };

        // Run in parallel with item subscription (non-blocking)
        checkParticipation();
    }, [isJourney, item, userId]);

    // Derived permission: Can Edit = Owner OR Participant
    const canEdit = isOwner || isParticipant;

    // Modal states
    const [showInspirationModal, setShowInspirationModal] = useState(false);
    const [showMemoryModal, setShowMemoryModal] = useState(false);
    const [showReflectionModal, setShowReflectionModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

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
    }, [id, isOwner, isParticipant, isDeleting]);

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
            { text: 'Delete', style: 'destructive', onPress: () => deleteInspiration(item!.id, inspirationId) },
        ]);
    };

    // Modal handlers
    const handleAddInspiration = async (type: 'image' | 'quote' | 'link', content: string, caption?: string) => {
        if (!item) return;
        await addInspiration(item.id, { type, content, caption });
    };

    const handleAddMemory = async (memoryId: string, imageUrl: string, caption: string) => {
        if (!item) return;
        await addMemory(item.id, { id: memoryId, imageUrl, caption, date: Date.now() });
    };

    const handleDeleteMemory = (memoryId: string) => {
        if (!item) return;
        Alert.alert('Delete Memory', 'Are you sure you want to delete this memory?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteMemory(item.id, memoryId) },
        ]);
    };

    const handleAddReflection = async (blocks: ReflectionBlock[]) => {
        if (!item) return;
        await addReflection(item.id, { contentBlocks: blocks, date: Date.now() });
    };

    const handleAddProgress = async (title: string, description?: string, imageUrl?: string) => {
        if (!item) return;
        await addProgress(item.id, { title, description, imageUrl, date: Date.now() });
    };

    const handleAddExpense = async (title: string, amount: number, category: Expense['category']) => {
        if (!item) return;
        await addExpense(item.id, { title, amount, category, date: Date.now() });
    };

    // Not Found State
    if (!item) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <Header
                    title="Dream Not Found"
                    leftAction={
                        <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" />
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style="light" />

            {/* Confetti Explosion */}
            <ConfettiExplosion trigger={showConfetti} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <DreamDetailHero
                    item={item}
                    isOwner={canEdit}
                    onEdit={handleEdit}
                    onGetInspired={canEdit ? undefined : handleGetInspired}
                />

                {/* Collaboration Section */}
                <CollaborationSection
                    dreamId={item.id}
                    isOwner={isOwner}
                    collaborationType={item.collaborationType}
                    onStartJourney={handleStartJourney}
                />

                {/* Main Content */}
                <View style={[styles.contentWrapper, { backgroundColor: colors.background }]}>
                    {/* Phase Selector - Only for owners and participants */}
                    {canEdit && (
                        <View style={[styles.phaseSelector, { backgroundColor: colors.border + '30' }]}>
                            {PHASES.map(({ id: phaseId, label, icon: Icon }) => {
                                const isActive = item.phase === phaseId;
                                const phaseColor = getPhaseColor(phaseId);
                                return (
                                    <TouchableOpacity
                                        key={phaseId}
                                        style={[
                                            styles.phaseButton,
                                            isActive && [styles.activePhaseButton, { backgroundColor: '#FFF' }],
                                        ]}
                                        onPress={() => handlePhaseChange(phaseId)}
                                        disabled={isLoading}
                                    >
                                        <Icon size={14} color={isActive ? phaseColor : colors.textMuted} />
                                        <Text style={[
                                            styles.phaseLabel,
                                            { color: isActive ? phaseColor : colors.textMuted },
                                        ]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Meta Row */}
                    {(formattedDate || item.location) && (
                        <View style={styles.metaRow}>
                            {formattedDate && (
                                <View style={styles.metaItem}>
                                    <Calendar size={14} color={colors.textMuted} />
                                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                        {formattedDate}
                                    </Text>
                                </View>
                            )}
                            {item.location && (
                                <View style={styles.metaItem}>
                                    <MapPin size={14} color={colors.textMuted} />
                                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                        {item.location}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Tab Bar - Only show if user can edit */}
                    {canEdit && (
                        <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
                            {TABS.map(({ id: tabId, label, icon: Icon }) => {
                                const isActive = activeTab === tabId;
                                return (
                                    <TouchableOpacity
                                        key={tabId}
                                        style={[
                                            styles.tabButton,
                                            isActive && { backgroundColor: colors.primary + '15' },
                                        ]}
                                        onPress={() => setActiveTab(tabId)}
                                    >
                                        <Icon size={16} color={isActive ? colors.primary : colors.textMuted} />
                                        <Text style={[
                                            styles.tabText,
                                            { color: isActive ? colors.primary : colors.textMuted },
                                        ]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Tab Content */}
                    <View style={styles.tabContent}>
                        {activeTab === 'story' && (
                            <>
                                {/* Description */}
                                {item.description && (
                                    <Card style={[styles.descriptionCard, { backgroundColor: colors.surface }]}>
                                        <Text style={[styles.descriptionText, { color: colors.textPrimary }]}>
                                            {item.description}
                                        </Text>
                                    </Card>
                                )}

                                {/* Inspiration Board */}
                                <InspirationBoard
                                    inspirations={item.inspirations}
                                    isOwner={canEdit}
                                    onAdd={canEdit ? () => setShowInspirationModal(true) : undefined}
                                    onDelete={canEdit ? handleDeleteInspiration : undefined}
                                />

                                {/* Memory Capsule */}
                                {(item.phase === 'doing' || item.phase === 'done') && (
                                    <MemoryCapsule
                                        memories={item.memories}
                                        onAdd={canEdit ? () => setShowMemoryModal(true) : undefined}
                                        onDelete={canEdit ? handleDeleteMemory : undefined}
                                    />
                                )}

                                {/* Reflections */}
                                {item.phase === 'done' && (
                                    <Reflections
                                        reflections={item.reflections}
                                        onAdd={canEdit ? () => setShowReflectionModal(true) : undefined}
                                    />
                                )}

                                {/* Comments Section - Only for public dreams */}
                                {item.isPublic && (
                                    <>
                                        <View style={styles.divider} />
                                        <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
                                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                                                Comments {item.commentsCount ? `(${item.commentsCount})` : ''}
                                            </Text>
                                        </View>
                                        <CommentSection
                                            dreamId={item.id}
                                            commentsCount={item.commentsCount}
                                            onCountChange={(count) => {
                                                if (item.commentsCount !== count) {
                                                    setItem(prev => prev ? { ...prev, commentsCount: count } : undefined);
                                                    updateDreamMetadata(item.id, { commentsCount: count });
                                                }
                                            }}
                                        />
                                    </>
                                )}

                                {/* Delete Button - Owner only */}
                                {isOwner && (
                                    <>
                                        <View style={styles.divider} />
                                        <Button
                                            title="Delete Dream"
                                            onPress={handleDelete}
                                            variant="danger"
                                            fullWidth
                                            loading={isDeleting}
                                        />
                                    </>
                                )}
                            </>
                        )}

                        {activeTab === 'progress' && (
                            <ProgressTab
                                item={item}
                                isOwner={canEdit}
                                onAddProgress={() => setShowProgressModal(true)}
                            />
                        )}

                        {activeTab === 'expenses' && (
                            <ExpensesTab
                                item={item}
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
        paddingBottom: 60,
    },
    contentWrapper: {
        marginTop: -20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 20,
        minHeight: 400,
    },
    // Phase Selector
    phaseSelector: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    phaseButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    activePhaseButton: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    phaseLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    // Meta Row
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        paddingHorizontal: 4,
        marginBottom: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    // Tab Bar
    tabBar: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        gap: 6,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // Tab Content
    tabContent: {
        gap: 16,
    },
    descriptionCard: {
        padding: 16,
        borderRadius: 16,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 22,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
});
