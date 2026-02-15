/**
 * InspirationBoard - Clean horizontal gallery for dream inspirations
 * No Ken Burns, no pulsing, no emojis. Just a smooth FlatList.
 */

import { Card } from '@/src/components/ui';
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
    const { colors } = useTheme();
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
                isOwner={isOwner}
                onDelete={onDelete}
            />
        );
    }, [colors, isOwner, onDelete]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Sparkles size={18} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        Inspirations
                    </Text>
                    {hasContent && (
                        <Text style={[styles.count, { color: colors.textMuted }]}>
                            {inspirations.length}
                        </Text>
                    )}
                </View>
                {onAdd && (
                    <TouchableOpacity
                        onPress={onAdd}
                        style={[styles.addButton, { backgroundColor: colors.primary + '15' }]}
                    >
                        <Plus size={16} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {hasContent ? (
                <>
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
                    {/* Pagination dots */}
                    {inspirations.length > 1 && (
                        <View style={styles.dots}>
                            {inspirations.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        {
                                            backgroundColor: index === activeIndex
                                                ? colors.primary
                                                : colors.border,
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </>
            ) : (
                <TouchableOpacity
                    style={[styles.emptyState, { borderColor: colors.border }]}
                    onPress={onAdd}
                    disabled={!onAdd}
                >
                    <Sparkles size={32} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                        {onAdd ? 'What inspired this dream?' : 'No inspirations yet'}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                        {onAdd ? 'Add a quote, image, or link' : 'This dream has no inspirations shared yet'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function InspirationCard({
    inspiration,
    colors,
    isOwner,
    onDelete,
}: {
    inspiration: Inspiration;
    colors: any;
    isOwner?: boolean;
    onDelete?: (id: string) => void;
}) {
    const deleteButton = isOwner && onDelete ? (
        <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(inspiration.id)}
        >
            <Trash2 size={14} color={colors.error} />
        </TouchableOpacity>
    ) : null;

    if (inspiration.type === 'image') {
        return (
            <View style={styles.card}>
                <View style={styles.imageCard}>
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
                </View>
            </View>
        );
    }

    if (inspiration.type === 'quote') {
        return (
            <View style={styles.card}>
                <Card style={[styles.quoteCard, { backgroundColor: colors.primary + '08' }]}>
                    <Text
                        style={[styles.quoteText, { color: colors.textPrimary }]}
                        numberOfLines={5}
                    >
                        &ldquo;{inspiration.content}&rdquo;
                    </Text>
                    {inspiration.caption && (
                        <Text style={[styles.attribution, { color: colors.textSecondary }]}>
                            — {inspiration.caption}
                        </Text>
                    )}
                    {deleteButton}
                </Card>
            </View>
        );
    }

    if (inspiration.type === 'link') {
        return (
            <View style={styles.card}>
                <Card style={[styles.linkCard, { backgroundColor: colors.surface }]}>
                    <Link size={20} color={colors.primary} />
                    <Text
                        style={[styles.linkText, { color: colors.primary }]}
                        numberOfLines={2}
                    >
                        {inspiration.content}
                    </Text>
                    {inspiration.caption && (
                        <Text
                            style={[styles.linkCaption, { color: colors.textSecondary }]}
                            numberOfLines={2}
                        >
                            {inspiration.caption}
                        </Text>
                    )}
                    {deleteButton}
                </Card>
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
        paddingHorizontal: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    count: {
        fontSize: 14,
        fontWeight: '500',
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        gap: CARD_GAP,
    },
    card: {
        width: CARD_WIDTH,
    },
    imageCard: {
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    cardImage: {
        width: CARD_WIDTH,
        height: 180,
    },
    captionOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    captionText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '500',
    },
    quoteCard: {
        padding: 20,
        borderRadius: 16,
        minHeight: 180,
        justifyContent: 'center',
        position: 'relative',
    },
    quoteText: {
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
        lineHeight: 24,
    },
    attribution: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 12,
    },
    linkCard: {
        padding: 20,
        borderRadius: 16,
        minHeight: 180,
        justifyContent: 'center',
        gap: 8,
        position: 'relative',
    },
    linkText: {
        fontSize: 14,
        lineHeight: 20,
    },
    linkCaption: {
        fontSize: 12,
        lineHeight: 16,
    },
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    emptyState: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 4,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
});
