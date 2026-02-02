import { Card } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Inspiration } from '@/src/types/item';
import { Plus, Sparkles } from 'lucide-react-native';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface InspirationBoardProps {
    inspirations?: Inspiration[];
    onAdd?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function InspirationBoard({ inspirations = [], onAdd }: InspirationBoardProps) {
    const { colors } = useTheme();

    const hasContent = inspirations && inspirations.length > 0;
    const featured = hasContent ? inspirations[0] : null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Sparkles size={18} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Inspiration Board</Text>
                </View>
                {onAdd && (
                    <TouchableOpacity onPress={onAdd} style={[styles.addButton, { backgroundColor: colors.primary + '15' }]}>
                        <Plus size={16} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {hasContent && featured ? (
                <>
                    {featured.type === 'image' && (
                        <View style={styles.featuredContainer}>
                            <Image
                                source={{ uri: featured.content }}
                                style={styles.featuredImage}
                                resizeMode="cover"
                            />
                            <View style={styles.overlay}>
                                <Text style={styles.overlayText}>This photo started it all</Text>
                            </View>
                        </View>
                    )}

                    {featured.type === 'quote' && (
                        <Card style={[styles.quoteCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.quoteText, { color: colors.textPrimary }]}>
                                "{featured.content}"
                            </Text>
                            {featured.caption && (
                                <Text style={[styles.quoteAuthor, { color: colors.textSecondary }]}>
                                    — {featured.caption}
                                </Text>
                            )}
                        </Card>
                    )}

                    {featured.type === 'link' && (
                        <Card style={[styles.linkCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.linkText, { color: colors.primary }]} numberOfLines={2}>
                                🔗 {featured.content}
                            </Text>
                            {featured.caption && (
                                <Text style={[styles.linkCaption, { color: colors.textSecondary }]}>
                                    {featured.caption}
                                </Text>
                            )}
                        </Card>
                    )}
                </>
            ) : (
                <TouchableOpacity
                    style={[styles.emptyState, { borderColor: colors.border }]}
                    onPress={onAdd}
                >
                    <Text style={styles.emptyEmoji}>💭</Text>
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                        What inspired this dream?
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                        Add a quote, image, or link
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
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
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featuredContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        height: SCREEN_WIDTH * 0.6,
        position: 'relative',
    },
    featuredImage: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    overlayText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },
    quoteCard: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 150,
    },
    quoteText: {
        fontSize: 18,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 28,
    },
    quoteAuthor: {
        fontSize: 14,
        fontWeight: '500',
    },
    linkCard: {
        padding: 16,
    },
    linkText: {
        fontSize: 14,
        marginBottom: 4,
    },
    linkCaption: {
        fontSize: 12,
    },
    emptyState: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyEmoji: {
        fontSize: 32,
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 14,
    },
});

