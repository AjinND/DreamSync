/**
 * CommunityCard - Card component for public dreams in community feed
 */

import { CommunityService } from '@/src/services/community';
import { useTheme } from '@/src/theme';
import { BucketItem } from '@/src/types/item';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle } from 'lucide-react-native';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface CommunityCardProps {
    dream: BucketItem;
    onLike: (dreamId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

const CATEGORY_EMOJI: Record<string, string> = {
    travel: '✈️',
    skill: '🎯',
    adventure: '🏔️',
    creative: '🎨',
    career: '💼',
    health: '💪',
    personal: '✨',
    other: '🌟',
};

const PHASE_COLORS: Record<string, string> = {
    dream: '#A855F7',
    doing: '#F59E0B',
    done: '#22C55E',
};

export function CommunityCard({ dream, onLike }: CommunityCardProps) {
    const { colors } = useTheme();
    const router = useRouter();

    const isLiked = CommunityService.isLikedByUser(dream);
    const likesCount = dream.likes?.length ?? dream.likesCount ?? 0;
    const commentsCount = dream.commentsCount || 0;
    const categoryEmoji = CATEGORY_EMOJI[dream.category] || '🌟';
    const phaseColor = PHASE_COLORS[dream.phase];

    const handlePress = () => {
        router.push(`/item/${dream.id}`);
    };

    const handleLike = (e: any) => {
        e.stopPropagation();
        onLike(dream.id);
    };

    const handleComment = (e: any) => {
        e.stopPropagation();
        // Navigate to dream and scroll to comments
        router.push(`/item/${dream.id}`);
    };

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <View style={styles.container}>
                {/* Left: Image */}
                <View style={styles.imageContainer}>
                    {dream.mainImage ? (
                        <Image
                            source={{ uri: dream.mainImage }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: phaseColor + '20' }]}>
                            <Text style={styles.placeholderEmoji}>{categoryEmoji}</Text>
                        </View>
                    )}

                    {/* Tiny Phase Indicator on Image */}
                    <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
                </View>

                {/* Right: Content */}
                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                            {dream.title}
                        </Text>
                        {(dream.collaborationType === 'group' || dream.collaborationType === 'open') && (
                            <View style={[styles.journeyBadge, { backgroundColor: colors.primary + '15' }]}>
                                <Text style={[styles.journeyBadgeText, { color: colors.primary }]}>
                                    Journey
                                </Text>
                            </View>
                        )}
                    </View>

                    {dream.description ? (
                        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                            {dream.description}
                        </Text>
                    ) : (
                        <View style={{ flex: 1 }} />
                    )}

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <View style={styles.actionsRow}>
                            {/* Like Button */}
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleLike}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Heart
                                    size={14}
                                    color={isLiked ? '#EF4444' : colors.textMuted}
                                    fill={isLiked ? '#EF4444' : 'transparent'}
                                />
                                <Text style={[styles.actionCount, { color: isLiked ? '#EF4444' : colors.textMuted }]}>
                                    {likesCount}
                                </Text>
                            </TouchableOpacity>

                            {/* Comment Button */}
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleComment}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <MessageCircle size={14} color={colors.textMuted} />
                                <Text style={[styles.actionCount, { color: colors.textMuted }]}>
                                    {commentsCount}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tags (Compact) */}
                        {dream.tags && dream.tags.length > 0 && (
                            <Text style={[styles.tagText, { color: colors.textMuted }]} numberOfLines={1}>
                                #{dream.tags[0]}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        borderRadius: 16,
        marginBottom: 12, // Reduced margin
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    container: {
        flexDirection: 'row',
        padding: 12,
        height: 104, // Fixed height for consistency
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 32,
    },
    phaseDot: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    content: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    journeyBadge: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    journeyBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    categoryEmoji: {
        fontSize: 14,
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    actionCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    tagText: {
        fontSize: 12,
        maxWidth: 80,
    },
});
