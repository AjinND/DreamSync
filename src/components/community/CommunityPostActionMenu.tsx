/**
 * CommunityPostActionMenu - Bottom sheet action menu for community posts
 * Options: Share, Report, Block User
 */

import { useTheme } from '@/src/theme';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Share2 } from 'lucide-react-native';
import { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface CommunityPostActionMenuProps {
    isOwnPost: boolean;
    onShare: () => void;
    onReport: () => void;
    onBlockUser?: () => void;
}

export const CommunityPostActionMenu = forwardRef<BottomSheetModal, CommunityPostActionMenuProps>(
    ({ isOwnPost, onShare, onReport, onBlockUser }, ref) => {
        const { colors } = useTheme();
        const snapPoints = useMemo(() => [isOwnPost ? 180 : 240], [isOwnPost]);

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

        const handleAction = (action: () => void) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            action();
            (ref as any)?.current?.dismiss();
        };

        return (
            <BottomSheetModal
                ref={ref}
                index={0}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={{ backgroundColor: colors.surface }}
                handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
                enableDismissOnClose
            >
                <BottomSheetView style={styles.container}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Post Options</Text>

                    {/* Share */}
                    <TouchableOpacity
                        style={[styles.actionRow, { borderBottomColor: colors.border }]}
                        onPress={() => handleAction(onShare)}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                            <Share2 size={20} color={colors.primary} />
                        </View>
                        <View style={styles.actionText}>
                            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Share Post</Text>
                            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                                Share this dream with others
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Report */}
                    {/* <TouchableOpacity
                        style={[styles.actionRow, { borderBottomColor: isOwnPost ? 'transparent' : colors.border }]}
                        onPress={() => handleAction(onReport)}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: '#FF9500' + '20' }]}>
                            <Flag size={20} color="#FF9500" />
                        </View>
                        <View style={styles.actionText}>
                            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Report Post</Text>
                            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                                Flag inappropriate content
                            </Text>
                        </View>
                    </TouchableOpacity> */}

                    {/* Block User (only if not own post) */}
                    {/* {!isOwnPost && onBlockUser && (
                        <TouchableOpacity
                            style={[styles.actionRow, { borderBottomColor: 'transparent' }]}
                            onPress={() => handleAction(onBlockUser)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: '#FF3B30' + '20' }]}>
                                <UserX size={20} color="#FF3B30" />
                            </View>
                            <View style={styles.actionText}>
                                <Text style={[styles.actionTitle, { color: '#FF3B30' }]}>Block User</Text>
                                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                                    Hide posts from this user
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )} */}
                </BottomSheetView>
            </BottomSheetModal>
        );
    }
);

CommunityPostActionMenu.displayName = 'CommunityPostActionMenu';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: 13,
    },
});
