/**
 * DreamSync Dream Components - DreamCard
 * Premium immersive dream card with gradient overlays and social actions
 */

import { AnimatedPressable, Avatar, GlassCard } from '@/src/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle } from 'lucide-react-native';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/theme';
import { BucketItem } from '@/src/types/item';
import { UserProfile } from '@/src/types/social';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2);

interface DreamCardProps {
    item: BucketItem;
    user?: UserProfile;
    onPress: () => void;
    onLike?: () => void;
    onComment?: () => void;
    variant?: 'default' | 'compact' | 'featured';
    showUser?: boolean;
    isLiked?: boolean;
    showSocial?: boolean;
}

export function DreamCard({
    item,
    user,
    onPress,
    onLike,
    onComment,
    variant = 'default',
    showUser = true,
    isLiked = false,
    showSocial = false,
}: DreamCardProps) {
    const { colors, isDark } = useTheme();

    const handleLike = () => {
        onLike?.();
    };

    const isCompact = variant === 'compact';
    const isFeatured = variant === 'featured';

    return (
        <AnimatedPressable
            onPress={onPress}
            style={[styles.card, isFeatured && styles.featuredCard]}
        >
            <View style={styles.imageContainer}>
                {item.mainImage ? (
                    <Image
                        source={{ uri: item.mainImage }}
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
                            { backgroundColor: colors.surfaceElevated },
                        ]}
                    >
                        <Text style={[styles.placeholderEmoji]}>✨</Text>
                    </View>
                )}

                {/* Gradient for image legibility */}
                <LinearGradient
                    colors={['transparent', isDark ? 'rgba(15,8,20,0.95)' : 'rgba(25,16,34,0.7)']}
                    locations={[0.3, 1]}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Status Badge (Top-Left) */}
                <View style={styles.statusContainer}>
                    <GlassCard intensity={80} tint="dark" borderRadius={99} style={styles.journeyBadge}>
                        <Text style={[styles.journeyBadgeText, { color: isDark ? '#D8B4FE' : '#5EEAD4' }]}>
                            {item.phase === 'done' ? 'Completed' : item.phase === 'doing' ? 'In Progress' : 'Planned'}
                        </Text>
                    </GlassCard>
                </View>

                {/* Floating Glass Content Overlay */}
                <GlassCard
                    intensity={100}
                    tint={isDark ? 'dark' : 'light'}
                    style={styles.contentOverlay}
                    borderRadius={16}
                >
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)', borderRadius: 16 }]} pointerEvents="none" />

                    <View style={styles.contentHeader}>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={[styles.title, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}
                                numberOfLines={2}
                            >
                                {item.title}
                            </Text>

                            {!isCompact && item.description && (
                                <Text
                                    style={[styles.description, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textSecondary }]}
                                    numberOfLines={1}
                                >
                                    {item.description}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        {/* User Info */}
                        {showUser && user && (
                            <View style={styles.userSection}>
                                <Avatar
                                    uri={user.avatar}
                                    name={user.displayName}
                                    size="xs"
                                />
                                <Text style={[styles.username, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textSecondary }]}>
                                    @{user.displayName.replace(' ', '').toLowerCase()}
                                </Text>
                            </View>
                        )}

                        {!showUser && <View style={{ flex: 1 }} />}

                        {/* Actions */}
                        {showSocial && (
                            <View style={styles.actions}>
                                <AnimatedPressable
                                    style={styles.actionButton}
                                    onPress={handleLike}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Heart
                                            size={18}
                                            color={isLiked ? colors.accent : (isDark ? 'rgba(255,255,255,0.85)' : colors.textSecondary)}
                                            fill={isLiked ? colors.accent : 'transparent'}
                                        />
                                        <Text style={[styles.actionCount, { color: isDark ? 'rgba(255,255,255,0.9)' : colors.textPrimary }]}>
                                            {item.likes?.length ?? item.likesCount ?? 0}
                                        </Text>
                                    </View>
                                </AnimatedPressable>

                                <AnimatedPressable
                                    style={styles.actionButton}
                                    onPress={onComment!}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <MessageCircle size={18} color={isDark ? 'rgba(255,255,255,0.85)' : colors.textSecondary} />
                                        <Text style={[styles.actionCount, { color: isDark ? 'rgba(255,255,255,0.9)' : colors.textPrimary }]}>
                                            {item.commentsCount || 0}
                                        </Text>
                                    </View>
                                </AnimatedPressable>
                            </View>
                        )}
                    </View>
                </GlassCard>
            </View>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: CARD_MARGIN,
        marginBottom: 16,
        borderRadius: 20,
    },
    featuredCard: {
        marginBottom: 24,
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: CARD_WIDTH * 0.9,
        borderRadius: 20,
    },
    coverImageCompact: {
        height: CARD_WIDTH * 0.6,
    },
    coverImageFeatured: {
        height: CARD_WIDTH * 1.2,
    },
    coverPlaceholder: {
        width: '100%',
        height: CARD_WIDTH * 0.9,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 56,
    },
    gradientOverlay: {
        // Kept for backward compat layout if needed anywhere else
    },
    statusContainer: {
        position: 'absolute',
        top: 14,
        left: 14,
    },
    contentOverlay: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        padding: 16,
    },
    contentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 28,
        marginBottom: 6,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    journeyBadge: {
        alignSelf: 'flex-start',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: 8,
    },
    journeyBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
        marginTop: 6,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    username: {
        fontSize: 13,
        marginLeft: 8,
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionCount: {
        fontSize: 14,
        fontWeight: '600',
    },
});
