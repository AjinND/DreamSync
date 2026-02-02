/**
 * DreamSync - Dream Detail Screen
 * Immersive view of a dream with status controls, editing, and deletion
 */

import { InspirationBoard, MemoryCapsule, Reflections } from '@/src/components/dream';
import { EmptyState, Header } from '@/src/components/shared';
import { Button, IconButton } from '@/src/components/ui';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useTheme } from '@/src/theme';
import { Phase } from '@/src/types/item';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    Calendar,
    ChevronLeft,
    Edit3,
    Flame,
    Moon,
    Sparkles,
    Trophy,
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
    const { items, updateItem, deleteItem } = useBucketStore();

    const [item, setItem] = useState(items.find((i) => i.id === id));
    const [activeTab, setActiveTab] = useState('Story');
    const [isDeleting, setIsDeleting] = useState(false);

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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style="light" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    {/* Background Image */}
                    {item.mainImage ? (
                        <Image source={{ uri: item.mainImage }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.heroPlaceholder, { backgroundColor: getPhaseColor(item.phase) }]}>
                            <Text style={styles.placeholderEmoji}>{categoryInfo.emoji}</Text>
                        </View>
                    )}

                    {/* Overlay Gradient/Tint could go here */}
                    <View style={styles.heroOverlay} />

                    {/* Header Actions (Absolute) */}
                    <SafeAreaView style={styles.headerAbsolute} edges={['top']}>
                        <View style={styles.blurButton}>
                            <IconButton
                                icon={ChevronLeft}
                                onPress={() => router.back()}
                                variant="ghost"
                                color="#FFF"
                            />
                        </View>
                        <View style={styles.blurButton}>
                            <IconButton
                                icon={Edit3}
                                onPress={handleEdit}
                                variant="ghost"
                                color="#FFF"
                            />
                        </View>
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
                            <TouchableOpacity
                                key={p.id}
                                onPress={() => handlePhaseChange(p.id)}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        styles.statusIconWrapper,
                                        item.phase === p.id && { backgroundColor: getPhaseColor(p.id) + '20' }
                                    ]}
                                >
                                    <p.icon
                                        size={20}
                                        color={item.phase === p.id ? getPhaseColor(p.id) : colors.textMuted}
                                    />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={[styles.statusLine, { backgroundColor: colors.border }]} />
                    <View style={[styles.statusBadgeContainer, { backgroundColor: getPhaseColor(item.phase) }]}>
                        <Trophy size={14} color="#FFF" />
                    </View>
                </View>

                {/* Info Bar */}
                <View style={styles.infoBar}>
                    <View style={[styles.infoChip, { backgroundColor: colors.surface }]}>
                        <Calendar size={14} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            {item.phase === 'done' ? 'Completed: ' : 'Target: '}
                            {formattedDate || 'Someday'}
                        </Text>
                    </View>

                    {/* Location placeholder if we had it */}
                    {/* <View style={[styles.infoChip, { backgroundColor: colors.surface }]}>
                        <MapPin size={14} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>Bali, Indonesia</Text>
                     </View> */}
                </View>

                {/* Tabs */}
                <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === tab ? colors.textPrimary : colors.textMuted },
                                activeTab === tab && styles.activeTabText
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
                            {/* Description / "Why This Matters" */}
                            <View style={[styles.sectionCard, { backgroundColor: colors.surface + '80' }]}>
                                <View style={styles.sectionHeader}>
                                    <Sparkles size={18} color={colors.primary} />
                                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Why This Matters</Text>
                                    <Edit3 size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                                </View>
                                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                                    "{item.description || 'No description yet. Why does this dream matter to you?'}"
                                </Text>
                            </View>

                            {/* Inspiration Board */}
                            <InspirationBoard inspirations={item.inspirations} />

                            {/* Memory Capsule */}
                            <MemoryCapsule memories={item.memories} />

                            {/* Reflections */}
                            <Reflections reflections={item.reflections} />

                            {/* Add Reflection Button (Placeholder action) */}
                            <TouchableOpacity style={[styles.addReflectionButton]} onPress={() => { }}>
                                <Text style={[styles.addReflectionText, { color: colors.textPrimary }]}>Add a Reflection</Text>
                            </TouchableOpacity>

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

                    {activeTab !== 'Story' && (
                        <EmptyState
                            icon={Moon}
                            title="Coming Soon"
                            description={`${activeTab} features are coming in the next update!`}
                        />
                    )}
                </View>

            </ScrollView>
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
        paddingBottom: 40,
    },
    heroContainer: {
        height: SCREEN_WIDTH * 0.8, // Taller hero
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
        backgroundColor: 'rgba(0,0,0,0.2)', // Slight darken
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
        fontSize: 32,
        fontWeight: '800',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    placeholderEmoji: {
        fontSize: 64,
    },
    // Status Bar
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
    statusBadgeContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Info Bar
    infoBar: {
        paddingHorizontal: 20,
        paddingBottom: 20,
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
        fontSize: 13,
        fontWeight: '500',
    },
    // Tabs
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
    },
    activeTabText: {
        fontWeight: '600',
    },
    // Content
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
        fontSize: 16,
        lineHeight: 24,
        fontStyle: 'italic',
    },
    addReflectionButton: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    addReflectionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 32,
    },
});
