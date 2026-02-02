/**
 * DreamSync - Dream Detail Screen
 * Immersive view of a dream with status controls, editing, and deletion
 */

import { EmptyState, Header, StatusBadge } from '@/src/components/shared';
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
    Heart,
    MessageCircle,
    Moon,
    Share2,
    Trash2,
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

export default function DreamDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { items, updateItem, deleteItem } = useBucketStore();

    const [item, setItem] = useState(items.find((i) => i.id === id));
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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" />
                <View style={styles.headerActions}>
                    <IconButton icon={Edit3} onPress={handleEdit} variant="ghost" />
                    <IconButton icon={Trash2} onPress={handleDelete} variant="ghost" color={colors.error} />
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Cover Image */}
                {item.mainImage ? (
                    <Image source={{ uri: item.mainImage }} style={styles.coverImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.coverPlaceholder, { backgroundColor: getPhaseColor(item.phase) + '20' }]}>
                        <Text style={styles.placeholderEmoji}>{categoryInfo.emoji}</Text>
                    </View>
                )}

                {/* Content Card */}
                <View style={[styles.contentCard, { backgroundColor: colors.surface }]}>
                    {/* Status & Category Row */}
                    <View style={styles.metaRow}>
                        <StatusBadge status={item.phase} size="md" />
                        <View style={[styles.categoryBadge, { backgroundColor: colors.border }]}>
                            <Text style={styles.categoryEmoji}>{categoryInfo.emoji}</Text>
                            <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>
                                {categoryInfo.label}
                            </Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        {item.title}
                    </Text>

                    {/* Description */}
                    {item.description && (
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            {item.description}
                        </Text>
                    )}

                    {/* Target Date */}
                    {formattedDate && (
                        <View style={styles.dateRow}>
                            <Calendar size={16} color={colors.textMuted} />
                            <Text style={[styles.dateText, { color: colors.textMuted }]}>
                                Target: {formattedDate}
                            </Text>
                        </View>
                    )}

                    {/* Phase Selector */}
                    <View style={styles.phaseSection}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                            Update Status
                        </Text>
                        <View style={styles.phaseRow}>
                            {PHASES.map((p) => {
                                const Icon = p.icon;
                                const phaseColor = getPhaseColor(p.id);
                                const isSelected = item.phase === p.id;

                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[
                                            styles.phaseChip,
                                            {
                                                backgroundColor: isSelected ? phaseColor + '25' : colors.background,
                                                borderColor: isSelected ? phaseColor : colors.border,
                                            },
                                        ]}
                                        onPress={() => handlePhaseChange(p.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Icon size={20} color={isSelected ? phaseColor : colors.textMuted} />
                                        <Text
                                            style={[
                                                styles.phaseLabel,
                                                { color: isSelected ? phaseColor : colors.textSecondary },
                                            ]}
                                        >
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsSection}>
                        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                            <Heart size={22} color={colors.textMuted} />
                            <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Like</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                            <MessageCircle size={22} color={colors.textMuted} />
                            <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Comment</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                            <Share2 size={22} color={colors.textMuted} />
                            <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Delete Action */}
                <View style={styles.dangerZone}>
                    <Button
                        title="Delete Dream"
                        onPress={handleDelete}
                        variant="danger"
                        fullWidth
                        loading={isDeleting}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    coverImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 0.6,
    },
    coverPlaceholder: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 0.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 64,
    },
    contentCard: {
        marginTop: -24,
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 6,
    },
    categoryEmoji: {
        fontSize: 14,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 36,
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 16,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    dateText: {
        fontSize: 14,
    },
    phaseSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 12,
    },
    phaseRow: {
        flexDirection: 'row',
        gap: 10,
    },
    phaseChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        gap: 8,
    },
    phaseLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    actionsSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    actionButton: {
        alignItems: 'center',
        gap: 4,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    dangerZone: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
});
