/**
 * DreamSync - Dream Detail Screen
 * Immersive view with phase-aware components and tab navigation
 */

import {
    AddExpenseModal,
    AddInspirationModal,
    AddMemoryModal,
    AddProgressModal,
    AddReflectionModal,
    InspirationBoard,
    MemoryCapsule,
    Reflections,
} from '@/src/components/dream';
import { EmptyState, Header } from '@/src/components/shared';
import { Button, Card, IconButton } from '@/src/components/ui';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useTheme } from '@/src/theme';
import { Expense, Phase, ProgressEntry } from '@/src/types/item';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    Calendar,
    ChevronLeft,
    DollarSign,
    Edit3,
    Flame,
    MapPin,
    Moon,
    Plus,
    Sparkles,
    Trophy,
    Users,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
    travel: { emoji: '✈️', label: 'Travel' },
    skill: { emoji: '🎯', label: 'Skill' },
    adventure: { emoji: '🏔️', label: 'Adventure' },
    creative: { emoji: '🎨', label: 'Creative' },
    career: { emoji: '💼', label: 'Career' },
    health: { emoji: '💪', label: 'Health' },
    personal: { emoji: '✨', label: 'Personal' },
};

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
        updateItem,
        deleteItem,
        addInspiration,
        addMemory,
        addReflection,
        addProgress,
        addExpense,
    } = useBucketStore();

    const [item, setItem] = useState(items.find((i) => i.id === id));
    const [activeTab, setActiveTab] = useState('Story');
    const [isDeleting, setIsDeleting] = useState(false);

    // Modal states
    const [showInspirationModal, setShowInspirationModal] = useState(false);
    const [showMemoryModal, setShowMemoryModal] = useState(false);
    const [showReflectionModal, setShowReflectionModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    useEffect(() => {
        const currentItem = items.find((i) => i.id === id);
        if (currentItem) {
            setItem(currentItem);
        }
    }, [items, id]);

    const getPhaseColor = (phase: Phase) => {
        switch (phase) {
            case 'dream': return colors.statusDream;
            case 'doing': return colors.statusDoing;
            case 'done': return colors.statusDone;
        }
    };

    const handleEdit = () => {
        router.push(`/item/add?id=${id}`);
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

    const categoryInfo = CATEGORY_LABELS[item.category] || { emoji: '✨', label: 'Other' };
    const formattedDate = item.targetDate
        ? new Date(item.targetDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : null;

    const totalExpenses = item.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style="light" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    {item.mainImage ? (
                        <Image source={{ uri: item.mainImage }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.heroPlaceholder, { backgroundColor: getPhaseColor(item.phase) }]}>
                            <Text style={styles.placeholderEmoji}>{categoryInfo.emoji}</Text>
                        </View>
                    )}

                    <View style={styles.heroOverlay} />

                    {/* Header Actions */}
                    <SafeAreaView style={styles.headerAbsolute} edges={['top']}>
                        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                            <ChevronLeft size={22} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
                            <Edit3 size={20} color="#FFF" />
                        </TouchableOpacity>
                    </SafeAreaView>

                    {/* Hero Content */}
                    <View style={styles.heroContent}>
                        <View style={styles.categoryPill}>
                            <Text style={styles.categoryPillText}>{categoryInfo.emoji} {categoryInfo.label}</Text>
                        </View>
                        <Text style={styles.heroTitle}>{item.title}</Text>
                    </View>
                </View>

                {/* Status Bar */}
                <View style={[styles.statusBar, { backgroundColor: colors.surface }]}>
                    <View style={styles.statusIcons}>
                        {PHASES.map(p => (
                            <TouchableOpacity key={p.id} onPress={() => handlePhaseChange(p.id)} activeOpacity={0.7}>
                                <View style={[
                                    styles.statusIconWrapper,
                                    item.phase === p.id && { backgroundColor: getPhaseColor(p.id) + '20' }
                                ]}>
                                    <p.icon size={20} color={item.phase === p.id ? getPhaseColor(p.id) : colors.textMuted} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={[styles.statusLine, { backgroundColor: colors.border }]} />
                    <View style={[styles.statusBadge, { backgroundColor: getPhaseColor(item.phase) }]}>
                        <Text style={styles.statusBadgeText}>{item.phase === 'done' ? '✓' : item.phase === 'doing' ? '→' : '○'}</Text>
                    </View>
                </View>

                {/* Info Bar */}
                <View style={styles.infoBar}>
                    <View style={[styles.infoChip, { backgroundColor: colors.surface }]}>
                        <Calendar size={14} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.phase === 'done' ? 'Completed' : 'Target'}: {formattedDate || 'Someday'}
                        </Text>
                    </View>
                    <View style={[styles.infoChip, { backgroundColor: colors.surface }]}>
                        <MapPin size={14} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.location || 'Somewhere in the universe'}
                        </Text>
                    </View>
                    {item.with && item.with.length > 0 && (
                        <View style={[styles.infoChip, { backgroundColor: colors.surface }]}>
                            <Users size={14} color={colors.textSecondary} />
                            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                With {item.with.join(', ')}
                            </Text>
                        </View>
                    )}
                    {item.inspiredCount && item.inspiredCount > 0 && (
                        <View style={[styles.infoChip, { backgroundColor: colors.accent + '20' }]}>
                            <Sparkles size={14} color={colors.accent} />
                            <Text style={[styles.infoText, { color: colors.accent }]}>
                                {item.inspiredCount} inspired
                            </Text>
                        </View>
                    )}
                </View>

                {/* Tabs */}
                <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && [styles.activeTab, { backgroundColor: colors.background }]]}
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

                {/* Tab Content */}
                <View style={styles.contentContainer}>
                    {activeTab === 'Story' && (
                        <>
                            {/* Why This Matters */}
                            <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                                <View style={styles.sectionHeader}>
                                    <Sparkles size={18} color={colors.primary} />
                                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Why This Matters</Text>
                                </View>
                                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                                    {item.description || 'Add a description to explain what this dream means to you...'}
                                </Text>
                            </Card>

                            {/* Inspiration Board - Always visible */}
                            <InspirationBoard
                                inspirations={item.inspirations}
                                onAdd={() => setShowInspirationModal(true)}
                            />

                            {/* Memory Capsule - Only for doing/done */}
                            {(item.phase === 'doing' || item.phase === 'done') && (
                                <MemoryCapsule
                                    memories={item.memories}
                                    onAdd={() => setShowMemoryModal(true)}
                                />
                            )}

                            {/* Reflections - Only for done */}
                            {item.phase === 'done' && (
                                <Reflections
                                    reflections={item.reflections}
                                    onAdd={() => setShowReflectionModal(true)}
                                />
                            )}

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

                    {activeTab === 'Progress' && (
                        <>
                            {item.phase === 'dream' ? (
                                <EmptyState
                                    icon={Flame}
                                    title="Start your journey first"
                                    description="Move this dream to 'Doing' to start tracking progress"
                                />
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.addEntryButton, { borderColor: colors.primary }]}
                                        onPress={() => setShowProgressModal(true)}
                                    >
                                        <Plus size={20} color={colors.primary} />
                                        <Text style={[styles.addEntryText, { color: colors.primary }]}>Add Progress Update</Text>
                                    </TouchableOpacity>

                                    {item.progress && item.progress.length > 0 ? (
                                        item.progress.map((entry: ProgressEntry) => (
                                            <Card key={entry.id} style={[styles.progressCard, { backgroundColor: colors.surface }]}>
                                                {entry.imageUrl && (
                                                    <Image source={{ uri: entry.imageUrl }} style={styles.progressImage} />
                                                )}
                                                <View style={styles.progressContent}>
                                                    <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>{entry.title}</Text>
                                                    {entry.description && (
                                                        <Text style={[styles.progressDesc, { color: colors.textSecondary }]}>{entry.description}</Text>
                                                    )}
                                                    <Text style={[styles.progressDate, { color: colors.textMuted }]}>
                                                        {new Date(entry.date).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </Card>
                                        ))
                                    ) : (
                                        <EmptyState
                                            icon={Flame}
                                            title="No progress yet"
                                            description="Document your journey by adding progress updates"
                                        />
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {activeTab === 'Expenses' && (
                        <>
                            {item.phase === 'dream' ? (
                                <EmptyState
                                    icon={DollarSign}
                                    title="Start your journey first"
                                    description="Move this dream to 'Doing' to track expenses"
                                />
                            ) : (
                                <>
                                    {/* Budget Summary */}
                                    <Card style={[styles.budgetCard, { backgroundColor: colors.surface }]}>
                                        <View style={styles.budgetRow}>
                                            <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>Total Spent</Text>
                                            <Text style={[styles.budgetAmount, { color: colors.textPrimary }]}>
                                                ${totalExpenses.toFixed(2)}
                                            </Text>
                                        </View>
                                        {item.budget && (
                                            <View style={styles.budgetRow}>
                                                <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>Budget</Text>
                                                <Text style={[styles.budgetAmount, { color: colors.primary }]}>
                                                    ${item.budget.toFixed(2)}
                                                </Text>
                                            </View>
                                        )}
                                    </Card>

                                    <TouchableOpacity
                                        style={[styles.addEntryButton, { borderColor: colors.primary }]}
                                        onPress={() => setShowExpenseModal(true)}
                                    >
                                        <Plus size={20} color={colors.primary} />
                                        <Text style={[styles.addEntryText, { color: colors.primary }]}>Add Expense</Text>
                                    </TouchableOpacity>

                                    {item.expenses && item.expenses.length > 0 ? (
                                        item.expenses.map((expense: Expense) => (
                                            <Card key={expense.id} style={[styles.expenseCard, { backgroundColor: colors.surface }]}>
                                                <View style={styles.expenseLeft}>
                                                    <DollarSign size={20} color={colors.textMuted} />
                                                    <View>
                                                        <Text style={[styles.expenseTitle, { color: colors.textPrimary }]}>{expense.title}</Text>
                                                        <Text style={[styles.expenseCategory, { color: colors.textMuted }]}>{expense.category}</Text>
                                                    </View>
                                                </View>
                                                <Text style={[styles.expenseAmount, { color: colors.textPrimary }]}>
                                                    ${expense.amount.toFixed(2)}
                                                </Text>
                                            </Card>
                                        ))
                                    ) : (
                                        <EmptyState
                                            icon={DollarSign}
                                            title="No expenses tracked"
                                            description="Keep track of what you spend on this dream"
                                        />
                                    )}
                                </>
                            )}
                        </>
                    )}
                </View>
            </ScrollView >

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
        </View >
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
        paddingBottom: 100,
    },
    heroContainer: {
        height: SCREEN_WIDTH * 0.75,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    headerAbsolute: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        zIndex: 10,
    },
    blurButton: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContent: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
    },
    categoryPill: {
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    categoryPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#000',
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    placeholderEmoji: {
        fontSize: 64,
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    statusIcons: {
        flexDirection: 'row',
        gap: 12,
    },
    statusIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    statusLine: {
        flex: 1,
        height: 2,
        marginHorizontal: 12,
        borderRadius: 1,
    },
    statusBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBadgeText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    infoBar: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 100,
        gap: 6,
    },
    infoText: {
        fontSize: 12,
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    activeTab: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    contentContainer: {
        paddingHorizontal: 20,
    },
    sectionCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 24,
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 32,
    },
    addEntryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        marginBottom: 20,
    },
    addEntryText: {
        fontSize: 15,
        fontWeight: '600',
    },
    progressCard: {
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
    },
    progressImage: {
        width: '100%',
        height: 150,
    },
    progressContent: {
        padding: 16,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    progressDesc: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    progressDate: {
        fontSize: 12,
    },
    budgetCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    budgetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    budgetLabel: {
        fontSize: 14,
    },
    budgetAmount: {
        fontSize: 20,
        fontWeight: '700',
    },
    expenseCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    expenseTitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    expenseCategory: {
        fontSize: 12,
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: '600',
    },
});
