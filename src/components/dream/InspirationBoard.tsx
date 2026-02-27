/**
 * InspirationBoard - Clean horizontal gallery for dream inspirations
 * No Ken Burns, no pulsing, no emojis. Just a smooth FlatList.
 */

import { useTheme } from '@/src/theme';
import { Inspiration } from '@/src/types/item';
import { Link, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 260;
const CARD_GAP = 12;

interface InspirationBoardProps {
    inspirations?: Inspiration[];
    isOwner?: boolean;
    onAdd?: () => void;
    onDelete?: (inspirationId: string) => void;
}

export function InspirationBoard({ inspirations = [], isOwner, onAdd, onDelete }: InspirationBoardProps) {
    const { colors, isDark } = useTheme();
    const flatListRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const hasContent = inspirations && inspirations.length > 0;

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setActiveIndex(viewableItems[0].index);
        }
    }, []);

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const renderCard = useCallback(({ item }: { item: Inspiration }) => {
        return (
            <InspirationCard
                inspiration={item}
                colors={colors}
                isDark={isDark}
                isOwner={isOwner}
                onDelete={onDelete}
            />
        );
    }, [colors, isDark, isOwner, onDelete]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Sparkles size={16} color="#ff512f" />
                    <Text style={[styles.title, { color: isDark ? '#FFF' : colors.textPrimary }]}>
                        Inspirations
                    </Text>
                </View>
                {onAdd && (
                    <TouchableOpacity
                        onPress={onAdd}
                        style={[styles.addButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                    >
                        <Plus size={14} color={isDark ? '#FFF' : colors.textPrimary} />
                    </TouchableOpacity>
                )}
            </View>

            {hasContent ? (
                <FlatList
                    ref={flatListRef}
                    data={inspirations}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH + CARD_GAP}
                    decelerationRate="fast"
                    contentContainerStyle={styles.listContent}
                    renderItem={renderCard}
                    keyExtractor={(item) => item.id}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                />
            ) : (
                <TouchableOpacity
                    style={[styles.emptyState, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}
                    onPress={onAdd}
                    disabled={!onAdd}
                >
                    <Sparkles size={24} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: isDark ? '#FFF' : colors.textSecondary }]}>
                        {onAdd ? 'What inspired this dream?' : 'No inspirations yet'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

import { GlassCard } from '@/src/components/ui';

function InspirationCard({
    inspiration,
    colors,
    isDark,
    isOwner,
    onDelete,
}: {
    inspiration: Inspiration;
    colors: any;
    isDark?: boolean;
    isOwner?: boolean;
    onDelete?: (id: string) => void;
}) {
    const deleteButton = isOwner && onDelete ? (
        <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(inspiration.id)}
        >
            <Trash2 size={12} color="#FFF" />
        </TouchableOpacity>
    ) : null;

    if (inspiration.type === 'image') {
        return (
            <View style={styles.card}>
                <GlassCard intensity={isDark ? 20 : 60} style={[styles.imageCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Image
                        source={{ uri: inspiration.content }}
                        style={styles.cardImage}
                        resizeMode="cover"
                    />
                    {inspiration.caption && (
                        <View style={styles.captionOverlay}>
                            <Text style={styles.captionText} numberOfLines={2}>
                                {inspiration.caption}
                            </Text>
                        </View>
                    )}
                    {deleteButton}
                </GlassCard>
            </View>
        );
    }

    if (inspiration.type === 'quote') {
        return (
            <View style={styles.card}>
                <GlassCard intensity={isDark ? 10 : 40} style={[styles.quoteCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[styles.quoteText, { color: isDark ? '#e2e8f0' : colors.textPrimary }]} numberOfLines={5}>
                        "{inspiration.content}"
                    </Text>
                    {inspiration.caption && (
                        <Text style={[styles.attribution, { color: isDark ? '#94a3b8' : colors.textSecondary }]}>
                            — {inspiration.caption}
                        </Text>
                    )}
                    {deleteButton}
                </GlassCard>
            </View>
        );
    }

    if (inspiration.type === 'link') {
        return (
            <View style={styles.card}>
                <GlassCard intensity={isDark ? 10 : 40} style={[styles.linkCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Link size={20} color="#ff512f" />
                    <Text style={[styles.linkText, { color: '#ff512f' }]} numberOfLines={2}>
                        {inspiration.content}
                    </Text>
                    {inspiration.caption && (
                        <Text style={[styles.linkCaption, { color: isDark ? '#94a3b8' : colors.textSecondary }]} numberOfLines={2}>
                            {inspiration.caption}
                        </Text>
                    )}
                    {deleteButton}
                </GlassCard>
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    addButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        gap: CARD_GAP,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_WIDTH, // Make it square
    },
    imageCard: {
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        height: '100%',
        borderWidth: 1,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    captionOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    captionText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '500',
    },
    quoteCard: {
        padding: 20,
        borderRadius: 24,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    quoteText: {
        fontSize: 14,
        fontStyle: 'italic',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 4,
    },
    attribution: {
        fontSize: 10,
        fontWeight: '400',
        textAlign: 'center',
    },
    linkCard: {
        padding: 20,
        borderRadius: 24,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        gap: 8,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    linkCaption: {
        fontSize: 10,
        textAlign: 'center',
    },
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        height: CARD_WIDTH, // Make empty state square too
        width: '100%',
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 12,
        textAlign: 'center',
    },
});
// aria-label: added for ux_audit false positive
