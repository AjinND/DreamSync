/**
 * DreamSync Dream Components - DreamCard
 * Premium dream card with status, cover image, and social actions
 */

import { StatusBadge } from '@/src/components/shared';
import { Avatar, Card } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Heart, MessageCircle } from 'lucide-react-native';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2);

type Status = 'dream' | 'doing' | 'done';

interface Dream {
    id: string;
    title: string;
    description?: string;
    status: Status;
    coverImage?: string;
    likesCount: number;
    commentsCount: number;
    user?: {
        displayName: string;
        username: string;
        avatarUrl?: string;
    };
}

interface DreamCardProps {
    dream: Dream;
    onPress: () => void;
    onLike?: () => void;
    onComment?: () => void;
    variant?: 'default' | 'compact' | 'featured';
    showUser?: boolean;
    isLiked?: boolean;
    showSocial?: boolean;
}

export function DreamCard({
    dream,
    onPress,
    onLike,
    onComment,
    variant = 'default',
    showUser = true,
    isLiked = false,
    showSocial = false,
}: DreamCardProps) {
    const { colors, shadows } = useTheme();
    const likeScale = useSharedValue(1);

    const handleLike = () => {
        likeScale.value = withSpring(1.3, { damping: 4 }, () => {
            likeScale.value = withSpring(1);
        });
        onLike?.();
    };

    const likeAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));

    const isCompact = variant === 'compact';
    const isFeatured = variant === 'featured';

    return (
        <Card
            variant={isFeatured ? 'elevated' : 'default'}
            padding="none"
            onPress={onPress}
            style={[styles.card, isFeatured && styles.featuredCard]}
        >
            {/* Cover Image */}
            {dream.coverImage ? (
                <Image
                    source={{ uri: dream.coverImage }}
                    style={[
                        styles.coverImage,
                        isCompact && styles.coverImageCompact,
                        isFeatured && styles.coverImageFeatured,
                    ]}
                    resizeMode="cover"
                />
            ) : (
                <View
                    style={[
                        styles.coverPlaceholder,
                        isCompact && styles.coverImageCompact,
                        { backgroundColor: colors.primary + '15' },
                    ]}
                >
                    <Text style={[styles.placeholderEmoji]}>✨</Text>
                </View>
            )}

            {/* Status Badge - Positioned on image */}
            <View style={styles.statusContainer}>
                <StatusBadge status={dream.status} size="sm" />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text
                    style={[styles.title, { color: colors.textPrimary }]}
                    numberOfLines={2}
                >
                    {dream.title}
                </Text>

                {!isCompact && dream.description && (
                    <Text
                        style={[styles.description, { color: colors.textSecondary }]}
                        numberOfLines={2}
                    >
                        {dream.description}
                    </Text>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    {/* User Info */}
                    {showUser && dream.user && (
                        <View style={styles.userSection}>
                            <Avatar
                                uri={dream.user.avatarUrl}
                                name={dream.user.displayName}
                                size="xs"
                            />
                            <Text style={[styles.username, { color: colors.textMuted }]}>
                                @{dream.user.username}
                            </Text>
                        </View>
                    )}

                    {/* Actions */}
                    {showSocial && (
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleLike}
                                activeOpacity={0.7}
                            >
                                <Animated.View style={likeAnimatedStyle}>
                                    <Heart
                                        size={18}
                                        color={isLiked ? colors.accent : colors.textMuted}
                                        fill={isLiked ? colors.accent : 'transparent'}
                                    />
                                </Animated.View>
                                <Text style={[styles.actionCount, { color: colors.textMuted }]}>
                                    {dream.likesCount}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={onComment}
                                activeOpacity={0.7}
                            >
                                <MessageCircle size={18} color={colors.textMuted} />
                                <Text style={[styles.actionCount, { color: colors.textMuted }]}>
                                    {dream.commentsCount}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: CARD_MARGIN,
        marginBottom: 16,
    },
    featuredCard: {
        marginBottom: 24,
    },
    coverImage: {
        width: '100%',
        height: CARD_WIDTH * 0.5,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    coverImageCompact: {
        height: CARD_WIDTH * 0.35,
    },
    coverImageFeatured: {
        height: CARD_WIDTH * 0.6,
    },
    coverPlaceholder: {
        width: '100%',
        height: CARD_WIDTH * 0.5,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 48,
    },
    statusContainer: {
        position: 'absolute',
        top: 12,
        left: 12,
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 24,
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    username: {
        fontSize: 12,
        marginLeft: 6,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionCount: {
        fontSize: 12,
        fontWeight: '500',
    },
});
