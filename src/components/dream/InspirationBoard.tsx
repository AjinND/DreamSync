import { Card } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Inspiration } from '@/src/types/item';
import { Sparkles } from 'lucide-react-native';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

interface InspirationBoardProps {
    inspirations?: Inspiration[];
    onAdd?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function InspirationBoard({ inspirations = [], onAdd }: InspirationBoardProps) {
    const { colors } = useTheme();

    if (!inspirations || inspirations.length === 0) return null;

    // For now, just show the first image or quote as a featured item
    // In future, this can be a masonry grid or carousel
    const featured = inspirations[0];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Sparkles size={18} color={colors.primary} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>Inspiration Board</Text>
            </View>

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
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    featuredContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        height: SCREEN_WIDTH * 0.8,
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
        minHeight: 200,
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
});
