/**
 * CommunityCard - Borderless, edge-to-edge card for modern community feed
 */

import { auth } from '@/firebaseConfig';
import { CommunityService } from '@/src/services/community';
import { useTheme } from '@/src/theme';
import { BucketItem } from '@/src/types/item';
import { formatTimeAgo } from '@/src/utils/formatTimeAgo';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, MoreVertical } from 'lucide-react-native';
import { memo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Image,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { CommunityPostActionMenu } from './CommunityPostActionMenu';

interface CommunityCardProps {
    dream: BucketItem;
    onLike: (dreamId: string) => void;
}

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

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
    travel: ['#3B82F6', '#06B6D4'],
    skill: ['#8B5CF6', '#A855F7'],
    adventure: ['#059669', '#10B981'],
    creative: ['#EC4899', '#F43F5E'],
    career: ['#F59E0B', '#EAB308'],
    health: ['#EF4444', '#F97316'],
    personal: ['#6366F1', '#8B5CF6'],
    other: ['#64748B', '#94A3B8'],
};

const PHASE_COLORS: Record<string, string> = {
    dream: '#A855F7',
    doing: '#F59E0B',
    done: '#22C55E',
};

const PHASE_LABELS: Record<string, string> = {
    dream: 'Dream',
    doing: 'Doing',
    done: 'Done',
};

export const CommunityCard = memo(function CommunityCard({ dream, onLike }: CommunityCardProps) {
    const { colors, isDark } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const router = useRouter();
    const actionMenuRef = useRef<BottomSheetModal>(null);
    const [imageOpacity] = useState(new Animated.Value(0));
    const [likeScale] = useState(new Animated.Value(1));

    const isLiked = CommunityService.isLikedByUser(dream);
    const likesCount = dream.likesCount ?? dream.likes?.length ?? 0;
    const commentsCount = dream.commentsCount || 0;
    const categoryEmoji = CATEGORY_EMOJI[dream.category] || '🌟';
    const phaseColor = PHASE_COLORS[dream.phase];
    const phaseLabel = PHASE_LABELS[dream.phase];
    const gradientColors = CATEGORY_GRADIENTS[dream.category] || CATEGORY_GRADIENTS.other;

    // Check if this is the current user's post
    const isOwnPost = dream.userId === auth.currentUser?.uid;

    const handlePress = () => {
        router.push(`/item/${dream.id}`);
    };

    const handleLike = (e: any) => {
        e.stopPropagation();

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Scale animation
        Animated.sequence([
            Animated.spring(likeScale, {
                toValue: 1.2,
                useNativeDriver: true,
                speed: 50,
            }),
            Animated.spring(likeScale, {
                toValue: 1,
                useNativeDriver: true,
                speed: 50,
            }),
        ]).start();

        onLike(dream.id);
    };

    const handleComment = (e: any) => {
        e.stopPropagation();
        router.push(`/item/${dream.id}?scrollTo=comments`);
    };

    const handleUserPress = (e: any) => {
        e.stopPropagation();
        router.push(`/profile/${dream.userId}` as any);
    };

    const handleMorePress = (e: any) => {
        e.stopPropagation();
        actionMenuRef.current?.present();
    };

    const handleShare = async () => {
        try {
            const shareUrl = Linking.createURL(`dream/${dream.id}`);
            const message = `Check out this dream: ${dream.title}`;

            await Share.share({
                message: `${message}\n${shareUrl}`,
                url: shareUrl,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleReport = () => {
        Alert.alert(
            'Report Post',
            'Why are you reporting this post?',
            [
                { text: 'Spam', onPress: () => submitReport('spam') },
                { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate') },
                { text: 'Harassment', onPress: () => submitReport('harassment') },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const submitReport = async (reason: string) => {
        try {
            await CommunityService.reportPost(dream.id, reason);
            Alert.alert('Thank you', 'Your report has been submitted and will be reviewed.');
        } catch (error) {
            console.error('Error submitting report:', error);
            Alert.alert('Error', 'Failed to submit report. Please try again.');
        }
    };

    const handleBlockUser = () => {
        Alert.alert(
            'Block User',
            `Are you sure you want to block ${dream.sharedBy?.displayName || 'this user'}? You won't see their posts anymore.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await CommunityService.blockUser(dream.userId);
                            Alert.alert(
                                'User Blocked',
                                'You will no longer see posts from this user. Refresh the feed to apply changes.'
                            );
                        } catch (error) {
                            console.error('Error blocking user:', error);
                            Alert.alert('Error', 'Failed to block user. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleImageLoad = () => {
        Animated.timing(imageOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    return (
        <View style={styles.container}>
            {/* Image Section - Full Width */}
            <TouchableOpacity onPress={handlePress} activeOpacity={0.95} style={[styles.imageContainer, { width: screenWidth }]}>
                {dream.mainImage ? (
                    <Animated.Image
                        source={{ uri: dream.mainImage }}
                        style={[styles.dreamImage, { opacity: imageOpacity, width: screenWidth }]}
                        resizeMode="cover"
                        onLoad={handleImageLoad}
                    />
                ) : (
                    <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.dreamImage, { width: screenWidth }]}
                    >
                        <Text style={styles.gradientEmoji}>{categoryEmoji}</Text>
                    </LinearGradient>
                )}

                {/* Floating Header - Overlaid on top */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent']}
                    style={styles.topOverlay}
                >
                    {/* Avatar & Name (Tappable) */}
                    <TouchableOpacity
                        style={styles.authorSection}
                        onPress={handleUserPress}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatar}>
                            {dream.sharedBy?.photoURL ? (
                                <Image
                                    source={{ uri: dream.sharedBy.photoURL }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <Text style={styles.avatarText}>
                                    {dream.sharedBy?.displayName?.charAt(0).toUpperCase() || 'A'}
                                </Text>
                            )}
                        </View>

                        {/* Name & Time */}
                        <View style={styles.authorInfo}>
                            <Text style={styles.authorName}>
                                {dream.sharedBy?.displayName || 'Anonymous'}
                            </Text>
                            <Text style={styles.timeAgo}>
                                {formatTimeAgo(dream.sharedAt || dream.createdAt)}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* More Button */}
                    <TouchableOpacity
                        style={styles.moreButton}
                        onPress={handleMorePress}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                    >
                        <MoreVertical size={20} color="#FFF" />
                    </TouchableOpacity>
                </LinearGradient>

                {/* Caption + Gradient Scrim - Overlaid on bottom */}
                {dream.shareCaption && (
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.bottomOverlay}
                    >
                        <Text style={styles.caption} numberOfLines={2}>
                            {dream.shareCaption}
                        </Text>
                    </LinearGradient>
                )}
            </TouchableOpacity>

            {/* Compact Info Bar - Below Image */}
            <View style={[styles.infoBar, { backgroundColor: isDark ? '#000' : colors.background }]}>
                {/* Like Button */}
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleLike}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                        <Heart
                            size={20}
                            color={isLiked ? '#EF4444' : colors.textMuted}
                            fill={isLiked ? '#EF4444' : 'transparent'}
                            strokeWidth={2}
                        />
                    </Animated.View>
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
                    <MessageCircle
                        size={20}
                        color={colors.textMuted}
                        strokeWidth={2}
                    />
                    <Text style={[styles.actionCount, { color: colors.textMuted }]}>
                        {commentsCount}
                    </Text>
                </TouchableOpacity>

                {/* Dream Title */}
                <Text style={[styles.dreamTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {dream.title}
                </Text>

                {/* Phase Badge */}
                <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '10' }]}>
                    <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
                    <Text style={[styles.phaseLabel, { color: phaseColor }]}>
                        {phaseLabel}
                    </Text>
                </View>
            </View>

            {/* Action Menu Bottom Sheet */}
            <CommunityPostActionMenu
                ref={actionMenuRef}
                isOwnPost={isOwnPost}
                onShare={handleShare}
                onReport={handleReport}
                onBlockUser={handleBlockUser}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 4, // Minimal gap between posts
    },
    imageContainer: {
        height: 280,
        position: 'relative',
    },
    dreamImage: {
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientEmoji: {
        fontSize: 64,
    },
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        paddingHorizontal: 16,
        paddingTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    authorSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    authorInfo: {
        flex: 1,
        gap: 2,
    },
    authorName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    timeAgo: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
    moreButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 40, // Gradient transition
    },
    caption: {
        fontSize: 14,
        lineHeight: 20,
        color: '#FFF',
    },
    infoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 12,
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
    dreamTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    phaseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    phaseDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    phaseLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
