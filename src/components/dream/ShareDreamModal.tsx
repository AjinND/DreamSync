/**
 * ShareDreamModal - Bottom sheet modal for sharing dreams
 * Handles phase restrictions, share confirmation, and deep link generation
 */

import { useTheme } from '@/src/theme';
import { BucketItem } from '@/src/types/item';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import {
    AlertCircle,
    Copy,
    Eye,
    EyeOff,
    Flame,
    Globe,
    Link as LinkIcon,
    Lock,
    Share2
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Button } from '../ui';

interface ShareDreamModalProps {
    visible: boolean;
    onClose: () => void;
    item: BucketItem;
    onShare: (caption?: string) => Promise<void>;
    onUnshare?: () => Promise<void>;
    onChangeToDoing?: () => Promise<void>;
}

export function ShareDreamModal({
    visible,
    onClose,
    item,
    onShare,
    onUnshare,
    onChangeToDoing,
}: ShareDreamModalProps) {
    const { colors, isDark } = useTheme();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [caption, setCaption] = useState('');

    // Phase check
    const isPhaseDream = item.phase === 'dream';
    const isAlreadyPublic = item.isPublic === true;

    // Snap points for bottom sheet
    const snapPoints = useMemo(() => {
        if (isPhaseDream) return ['45%'];
        if (isAlreadyPublic) return ['55%'];
        return ['80%'];
    }, [isPhaseDream, isAlreadyPublic]);

    // Generate deep link
    useEffect(() => {
        if (isAlreadyPublic) {
            const link = Linking.createURL(`item/${item.id}`);
            setShareLink(link);
        }
    }, [isAlreadyPublic, item.id]);

    useEffect(() => {
        if (visible) {
            setCaption(''); // Reset caption when modal opens
            bottomSheetRef.current?.present();
        } else {
            bottomSheetRef.current?.dismiss();
        }
    }, [visible]);

    const handleClose = useCallback(() => {
        bottomSheetRef.current?.dismiss();
    }, []);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    const handleChangePhase = async () => {
        handleClose();
        await new Promise((resolve) => setTimeout(resolve, 300));
        Alert.alert(
            'Change to Doing?',
            'You can share this dream once you start working on it.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Change to Doing',
                    onPress: async () => {
                        if (!onChangeToDoing) return;
                        try {
                            setIsLoading(true);
                            await onChangeToDoing();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                            console.error('Failed to change phase:', error);
                            Alert.alert('Error', 'Failed to change dream status. Please try again.');
                        } finally {
                            setIsLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleShare = async () => {
        try {
            setIsLoading(true);
            const trimmedCaption = caption.trim() || undefined;
            await onShare(trimmedCaption);
            handleClose();
        } catch (error) {
            console.error('Share failed:', error);
            Alert.alert('Error', 'Failed to share dream. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnshare = async () => {
        if (!onUnshare) return;

        try {
            setIsLoading(true);
            handleClose();
            await onUnshare();
        } catch (error) {
            Alert.alert('Error', 'Failed to update privacy. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (!shareLink) return;
        await Clipboard.setStringAsync(shareLink);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copied!', 'Link copied to clipboard');
    };

    // Private fields that remain encrypted
    const privateFields = ['Expenses', 'Progress'];
    const publicFields = ['Title', 'Description', 'Category', 'Phase', 'Main Image', 'Inspirations', 'Reflections', 'Memories'];

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose
            onDismiss={onClose}
            backdropComponent={renderBackdrop}
            backgroundStyle={{ backgroundColor: colors.surface }}
            handleIndicatorStyle={{ backgroundColor: colors.border }}
            enableDismissOnClose
        >
            <BottomSheetView style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Phase Restriction State */}
                    {isPhaseDream && (
                        <>
                            <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
                                <AlertCircle size={32} color={colors.error} />
                            </View>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>
                                Start Your Journey First
                            </Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]}>
                                Dreams can be shared once you begin working on them. Change the status to &apos;Doing&apos; to share with the community.
                            </Text>
                            <View style={styles.actions}>
                                <Button
                                    title="Change to Doing"
                                    onPress={handleChangePhase}
                                    variant="primary"
                                    fullWidth
                                    icon={Flame}
                                />
                                <Button
                                    title="Cancel"
                                    onPress={handleClose}
                                    variant="ghost"
                                    fullWidth
                                />
                            </View>
                        </>
                    )}

                    {/* Already Public State */}
                    {!isPhaseDream && isAlreadyPublic && (
                        <>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                                <Globe size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>
                                Dream is Public
                            </Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]}>
                                Your dream is visible to the community. Anyone can view and comment on it.
                            </Text>

                            {/* Share Link */}
                            {shareLink && (
                                <TouchableOpacity
                                    style={[styles.linkBox, { backgroundColor: colors.background, borderColor: colors.border }]}
                                    onPress={handleCopyLink}
                                >
                                    <LinkIcon size={18} color={colors.textSecondary} />
                                    <Text
                                        style={[styles.linkText, { color: colors.textSecondary }]}
                                        numberOfLines={1}
                                    >
                                        {shareLink}
                                    </Text>
                                    <Copy size={18} color={colors.primary} />
                                </TouchableOpacity>
                            )}

                            <View style={styles.actions}>
                                <Button
                                    title="Copy Share Link"
                                    onPress={handleCopyLink}
                                    variant="primary"
                                    fullWidth
                                    icon={Share2}
                                />
                                {onUnshare && (
                                    <Button
                                        title="Make Private"
                                        onPress={handleUnshare}
                                        variant="ghost"
                                        fullWidth
                                        loading={isLoading}
                                        icon={Lock}
                                    />
                                )}
                            </View>
                        </>
                    )}

                    {/* Ready to Share State */}
                    {!isPhaseDream && !isAlreadyPublic && (
                        <>
                            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                                <Share2 size={32} color={colors.accent} />
                            </View>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>
                                Share with Community
                            </Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]}>
                                Your dream will be visible to all users. Comments will be enabled and others can get inspired by your journey.
                            </Text>

                            {/* Privacy Note */}
                            <View style={[styles.privacyNote, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                                <Lock size={16} color={colors.primary} />
                                <Text style={[styles.privacyNoteText, { color: colors.textSecondary }]}>
                                    Private details (expenses and progress) will remain hidden for other users
                                </Text>
                            </View>

                            {/* Share Caption Input */}
                            <View style={styles.captionContainer}>
                                <Text style={[styles.captionLabel, { color: colors.textPrimary }]}>
                                    Add a caption
                                </Text>
                                <BottomSheetTextInput
                                    style={[
                                        styles.captionInput,
                                        {
                                            color: colors.textPrimary,
                                            backgroundColor: colors.background,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                    placeholder="Tell the community about this dream..."
                                    placeholderTextColor={colors.textMuted}
                                    value={caption}
                                    onChangeText={setCaption}
                                    multiline
                                    maxLength={500}
                                    numberOfLines={3}
                                />
                                <Text style={[styles.captionCount, { color: colors.textMuted }]}>
                                    {caption.length}/500
                                </Text>
                            </View>

                            {/* Preview Section */}
                            <TouchableOpacity
                                style={styles.previewToggle}
                                onPress={() => setShowPreview(!showPreview)}
                            >
                                <Text style={[styles.previewToggleText, { color: colors.primary }]}>
                                    {showPreview ? 'Hide' : 'Show'} what will be public
                                </Text>
                                {showPreview ? (
                                    <EyeOff size={18} color={colors.primary} />
                                ) : (
                                    <Eye size={18} color={colors.primary} />
                                )}
                            </TouchableOpacity>

                            {showPreview && (
                                <View style={[styles.previewBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <View style={styles.previewSection}>
                                        <Text style={[styles.previewLabel, { color: colors.statusDone }]}>
                                            ✓ Public Fields
                                        </Text>
                                        <Text style={[styles.previewList, { color: colors.textSecondary }]}>
                                            {publicFields.join(', ')}
                                        </Text>
                                    </View>
                                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                                    <View style={styles.previewSection}>
                                        <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                                            🔒 Private Fields (Encrypted)
                                        </Text>
                                        <Text style={[styles.previewList, { color: colors.textSecondary }]}>
                                            {privateFields.join(', ')}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <View style={styles.actions}>
                                <Button
                                    title="Share Dream"
                                    onPress={handleShare}
                                    variant="primary"
                                    fullWidth
                                    loading={isLoading}
                                    icon={Share2}
                                />
                                <Button
                                    title="Cancel"
                                    onPress={handleClose}
                                    variant="ghost"
                                    fullWidth
                                />
                            </View>
                        </>
                    )}
                </ScrollView>
            </BottomSheetView>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        gap: 16,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginTop: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
    },
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    privacyNoteText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    previewToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    previewToggleText: {
        fontSize: 14,
        fontWeight: '600',
    },
    previewBox: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        gap: 12,
    },
    previewSection: {
        gap: 6,
    },
    previewLabel: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    previewList: {
        fontSize: 13,
        lineHeight: 18,
    },
    divider: {
        height: 1,
    },
    linkBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    linkText: {
        flex: 1,
        fontSize: 13,
    },
    captionContainer: {
        gap: 8,
    },
    captionLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    captionInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        lineHeight: 22,
        minHeight: 80,
        maxHeight: 120,
    },
    captionCount: {
        fontSize: 12,
        textAlign: 'right',
    },
    actions: {
        gap: 12,
        marginTop: 8,
    },
});
