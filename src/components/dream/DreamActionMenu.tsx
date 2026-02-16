/**
 * DreamActionMenu - Bottom sheet action menu for dream details
 * Modern three-dot menu with Edit, Share Link, Delete options
 */

import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/src/theme';
import { Copy, Edit3, Trash2, Link as LinkIcon } from 'lucide-react-native';
import { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface DreamActionMenuProps {
    onEdit: () => void;
    onShareLink?: () => void;
    onDelete: () => void;
    canDelete?: boolean;
}

export const DreamActionMenu = forwardRef<BottomSheetModal, DreamActionMenuProps>(
    ({ onEdit, onShareLink, onDelete, canDelete = false }, ref) => {
        const { colors, isDark } = useTheme();
        const snapPoints = useMemo(() => [canDelete ? 240 : 180], [canDelete]);

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
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Actions</Text>

                    {/* Edit */}
                    <TouchableOpacity
                        style={[styles.actionRow, { borderBottomColor: colors.border }]}
                        onPress={() => handleAction(onEdit)}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                            <Edit3 size={20} color={colors.primary} />
                        </View>
                        <View style={styles.actionText}>
                            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Edit Dream</Text>
                            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                                Modify details and content
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Share Link */}
                    {onShareLink && (
                        <TouchableOpacity
                            style={[styles.actionRow, { borderBottomColor: colors.border }]}
                            onPress={() => handleAction(onShareLink)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                                <LinkIcon size={20} color={colors.accent} />
                            </View>
                            <View style={styles.actionText}>
                                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Copy Share Link</Text>
                                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                                    Share with others
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Delete */}
                    {canDelete && (
                        <TouchableOpacity
                            style={[styles.actionRow, { borderBottomColor: 'transparent' }]}
                            onPress={() => handleAction(onDelete)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: '#FF3B3020' }]}>
                                <Trash2 size={20} color="#FF3B30" />
                            </View>
                            <View style={styles.actionText}>
                                <Text style={[styles.actionTitle, { color: '#FF3B30' }]}>Delete Dream</Text>
                                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                                    Permanently remove
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </BottomSheetView>
            </BottomSheetModal>
        );
    }
);

DreamActionMenu.displayName = 'DreamActionMenu';

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
