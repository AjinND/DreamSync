/**
 * DreamSync - Dream Detail Screen
 * Refactored with extracted components for cleaner architecture
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
import { EmptyState, Header } from '@/src/components/shared';
import { CommentSection } from '@/src/components/social';
import { Button, Card, IconButton } from '@/src/components/ui';
import { CommunityService } from '@/src/services/community';
import { JourneysService } from '@/src/services/journeys';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useTheme } from '@/src/theme';
import { BucketItem, Expense, Phase } from '@/src/types/item';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    Calendar,
    ChevronLeft,
    Flame,
    MapPin,
    Moon,
    Sparkles,
    Trophy,
    Users
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

const PHASES: { id: Phase; label: string; icon: any }[] = [
    { id: 'dream', label: 'Dream', icon: Moon },
    { id: 'doing', label: 'Doing', icon: Flame },
    { id: 'done', label: 'Done', icon: Trophy },
];

const TABS = ['Story', 'Progress', 'Expenses'];

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
        addMemory,
        addReflection,
        addProgress,
        addExpense,
    } = useBucketStore();

    const [item, setItem] = useState<BucketItem | undefined>(items.find((i) => i.id === id));
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('Story');
    const [isDeleting, setIsDeleting] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);

    // Check ownership
    const isOwner = item?.userId === auth.currentUser?.uid;
    const isJourney = item?.collaborationType === 'group' || item?.collaborationType === 'open';

    useEffect(() => {
        const checkChat = async () => {
            if (isJourney && item) {
                // In a real implementation we would fetch the chat ID associated with this journey
                // For now, we simulate finding the chat ID deterministically or via service
                // Just generating the ID based on our schema: journey_{dreamId}
                // Correct ID Schema: journey_{journeyId}
                // (Not dreamId, because deep linking and service use journeyId)
                if (item.journeyId) {
                    const potentialChatId = `journey_${item.journeyId}`;
                    setChatId(potentialChatId);
                } else {
                    // Fallback for legacy items without journeyId synced?
                    // Best to just rely on journeyId being present for group items
                    // console.warn("Journey item missing journeyId");
                }
            }
        }
        checkChat();
    }, [isJourney, item]);

    // Modal states
    const [showInspirationModal, setShowInspirationModal] = useState(false);
    const [showMemoryModal, setShowMemoryModal] = useState(false);
    const [showReflectionModal, setShowReflectionModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    useEffect(() => {
        const loadDream = async () => {
            if (typeof id !== 'string' || isDeleting) return;

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
    }, [items, id, isDeleting]);

    const getPhaseColor = (phase: Phase) => {
        switch (phase) {
            case 'dream': return colors.statusDream;
            case 'doing': return colors.statusDoing;
            case 'done': return colors.statusDone;
        }
    };

    const handleEdit = () => {
        if (!isOwner) return;
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
                mainImage: item.mainImage,
                images: item.images,
                basedOnTemplateId: item.id,
                collaborationType: 'solo',
                isPublic: false,
            });
            Alert.alert(
                'Inspired! ✨',
                'This dream has been added to your list.',
                [
                    { text: 'View My List', onPress: () => router.push('/(tabs)') },
                    { text: 'Keep Browsing', style: 'cancel' }
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

        try {
            setIsLoading(true);
            // Create Journey
            await JourneysService.createJourney(item.id, auth.currentUser.uid, {
                title: item.title,
                description: item.description || '',
                image: item.mainImage || null,
                authorName: auth.currentUser.displayName || 'Anonymous',
                authorAvatar: auth.currentUser.photoURL || null
            });

            // Update local item
            await updateItem(item.id, { collaborationType: 'group' });

            Alert.alert('Journey Started! 🚀', 'You can now invite friends to this dream.');
        } catch (error) {
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
        if (!isOwner) return;
        if (item && newPhase !== item.phase) {
            await updateItem(item.id, { phase: newPhase });
        }
    };

    // Modal handlers
    const handleAddInspiration = async (type: 'image' | 'quote' | 'link', content: string, caption?: string) => {
        if (!item) return;
        await addInspiration(item.id, { type, content, caption });
    };

    const handleAddMemory = async (imageUrl: string, caption: string) => {
        if (!item) return;
        await addMemory(item.id, { imageUrl, caption, date: Date.now() });
    };

    const handleAddReflection = async (question: string, answer: string) => {
        if (!item) return;
        await addReflection(item.id, { question, answer, date: Date.now() });
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

    const visibleTabs = isOwner ? TABS : ['Story'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style="light" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <DreamDetailHero
                    item={item}
                    isOwner={isOwner}
                    onEdit={handleEdit}
                    onGetInspired={handleGetInspired}
                />

                {/* Collaboration Section */}
                <CollaborationSection
                    dreamId={item.id}
                    isOwner={isOwner}
                    onStartJourney={handleStartJourney}
                />

                {/* Main Content */}
                <View style={[styles.contentWrapper, { backgroundColor: colors.background }]}>
                    {/* Phase Selector - Only for owners */}
                    {isOwner && (
                        <View style={[styles.phaseSelector, { backgroundColor: colors.surface }]}>
                            {PHASES.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => handlePhaseChange(p.id)}
                                    style={[
                                        styles.phaseButton,
                                        item.phase === p.id && { backgroundColor: getPhaseColor(p.id) + '20' }
                                    ]}
                                >
                                    <p.icon
                                        size={18}
                                        color={item.phase === p.id ? getPhaseColor(p.id) : colors.textMuted}
                                    />
                                    <Text style={[
                                        styles.phaseLabel,
                                        { color: item.phase === p.id ? getPhaseColor(p.id) : colors.textMuted }
                                    ]}>
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Info Chips */}
                    <View style={styles.infoRow}>
                        <View style={[styles.infoChip, { backgroundColor: colors.surface }]}>
                            <Calendar size={14} color={colors.textSecondary} />
                            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                                {formattedDate || 'Someday'}
                            </Text>
                        </View>
                        {item.location && (
                            <View style={[styles.infoChip, { backgroundColor: colors.surface }]}>
                                <MapPin size={14} color={colors.textSecondary} />
                                <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {item.location}
                                </Text>
                            </View>
                        )}
                        {item.with && item.with.length > 0 && (
                            <View style={[styles.infoChip, { backgroundColor: colors.surface }]}>
                                <Users size={14} color={colors.textSecondary} />
                                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                    {item.with.length} people
                                </Text>
                            </View>
                        )}
                        {item.inspiredCount && item.inspiredCount > 0 && (
                            <View style={[styles.infoChip, { backgroundColor: colors.accent + '15' }]}>
                                <Sparkles size={14} color={colors.accent} />
                                <Text style={[styles.infoText, { color: colors.accent }]}>
                                    {item.inspiredCount} inspired
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Tabs */}
                    {visibleTabs.length > 1 && (
                        <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
                            {visibleTabs.map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[
                                        styles.tabButton,
                                        activeTab === tab && [styles.activeTab, { backgroundColor: colors.background }]
                                    ]}
                                    onPress={() => setActiveTab(tab)}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        { color: activeTab === tab ? colors.textPrimary : colors.textMuted }
                                    ]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Tab Content */}
                    <View style={styles.tabContent}>
                        {activeTab === 'Story' && (
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
                                    onAdd={isOwner ? () => setShowInspirationModal(true) : undefined}
                                />

                                {/* Memory Capsule */}
                                {(item.phase === 'doing' || item.phase === 'done') && (
                                    <MemoryCapsule
                                        memories={item.memories}
                                        onAdd={isOwner ? () => setShowMemoryModal(true) : undefined}
                                    />
                                )}

                                {/* Reflections */}
                                {item.phase === 'done' && (
                                    <Reflections
                                        reflections={item.reflections}
                                        onAdd={isOwner ? () => setShowReflectionModal(true) : undefined}
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

                        {activeTab === 'Progress' && (
                            <ProgressTab
                                item={item}
                                isOwner={isOwner}
                                onAddProgress={() => setShowProgressModal(true)}
                            />
                        )}

                        {activeTab === 'Expenses' && (
                            <ExpensesTab
                                item={item}
                                isOwner={isOwner}
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
    fabContainer: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    fab: {
        backgroundColor: '#A78BFA', // Primary color
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
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
    phaseSelector: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
    },
    phaseButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    phaseLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    infoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 5,
    },
    infoText: {
        fontSize: 13,
        fontWeight: '500',
    },
    tabBar: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
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
