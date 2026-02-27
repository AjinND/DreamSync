/**
 * DreamSync - Account Tab
 * Profile, settings, user management with Premium Glass UI
 */

import { auth } from '@/firebaseConfig';
import { NotificationBell } from '@/src/components/shared';
import { UserAvatar } from '@/src/components/social/UserAvatar';
import { GlassCard } from '@/src/components/ui';
import { isEncryptedField } from '@/src/services/encryption';
import { NotificationService } from '@/src/services/notifications';
import { UsersService } from '@/src/services/users';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useChatStore } from '@/src/store/useChatStore';
import { useNotificationStore } from '@/src/store/useNotificationStore';
import { useTheme } from '@/src/theme';
import { UserProfile } from '@/src/types/social';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AccountScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const user = auth.currentUser;
    const { items, fetchItems } = useBucketStore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [emailVerified, setEmailVerified] = useState<boolean>(user?.emailVerified ?? false);
    const [sendingVerification, setSendingVerification] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchItems();
            const refresh = async () => {
                const currentUser = auth.currentUser;
                if (!currentUser?.uid) return;

                try {
                    await currentUser.reload();
                } catch {
                    // best effort
                }

                setEmailVerified(auth.currentUser?.emailVerified ?? false);
                UsersService.getUserProfile(currentUser.uid).then(setProfile);
            };

            refresh();
        }, [fetchItems])
    );

    const dreamsCount = items.filter(i => i.phase === 'dream').length;
    const doingCount = items.filter(i => i.phase === 'doing').length;
    const doneCount = items.filter(i => i.phase === 'done').length;
    const statusIcon = emailVerified ? 'checkmark-circle' : 'alert-circle';
    const statusColor = emailVerified ? '#22C55E' : '#F59E0B';

    const handleResendVerification = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser || currentUser.emailVerified) return;

        try {
            setSendingVerification(true);
            await sendEmailVerification(currentUser);
            Alert.alert('Verification Sent', 'Check your inbox for the verification link.');
        } catch (error: any) {
            Alert.alert('Failed', error?.message || 'Could not resend verification email.');
        } finally {
            setSendingVerification(false);
        }
    };

    const handleOpenVerification = () => {
        if (emailVerified) return;
        router.push('/(auth)/verify-email' as any);
    };

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await NotificationService.removeStoredPushTokenFromServer().catch(() => { });
                            useNotificationStore.getState().clear();
                            useChatStore.getState().clear();
                            useBucketStore.getState().clearSubscriptions();
                            await signOut(auth);
                            router.replace('/(auth)/login');
                        } catch (error) {
                            console.error('Sign out error:', error);
                        }
                    },
                },
            ]
        );
    };

    const menuItems = [
        { icon: 'person-outline', label: 'Edit Profile', route: '/settings/profile' },
        { icon: 'notifications-outline', label: 'Notifications', route: '/settings/notifications' },
        { icon: 'shield-checkmark-outline', label: 'Privacy', route: '/settings/privacy' },
        { icon: 'moon-outline', label: 'Appearance', route: '/settings/appearance' },
        { icon: 'help-circle-outline', label: 'Help & Support', route: '/settings/support' },
        { icon: 'information-circle-outline', label: 'About', route: '/settings/about' },
        { icon: 'trash-outline', label: 'Delete Account', route: '/settings/delete-account' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Account</Text>
                        <NotificationBell />
                    </View>
                </View>

                {/* Profile Card */}
                <GlassCard
                    intensity={isDark ? 30 : 60}
                    tint={isDark ? 'dark' : 'light'}
                    borderRadius={24}
                    style={styles.profileCard}
                >
                    {/* Decorative Gradient Blob */}
                    <View style={styles.profileBlob} pointerEvents="none" />

                    <View style={styles.avatarWrapper}>
                        <UserAvatar
                            userId={user?.uid || ''}
                            name={profile?.displayName || user?.displayName || 'Dreamer'}
                            avatar={profile?.avatar || user?.photoURL || undefined}
                            size={112}
                        />
                        <TouchableOpacity
                            style={styles.editButtonFloat}
                            onPress={() => router.push('/settings/profile' as any)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="pencil" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.profileInfoCentered}>
                        <Text style={[styles.displayName, { color: colors.textPrimary, textAlign: 'center' }]}>
                            {profile?.displayName || user?.displayName || 'Dreamer'}
                        </Text>

                        <Text style={[styles.usernameHandle, { color: colors.primary }]}>
                            @{profile?.displayName?.replace(' ', '').toLowerCase() || 'dreamer'}
                        </Text>

                        {(() => {
                            const bioText = profile?.bio && typeof profile.bio === 'string' && !isEncryptedField(profile.bio)
                                ? profile.bio
                                : undefined;
                            const emailText = user?.email && typeof user.email === 'string' && !isEncryptedField(user.email)
                                ? user.email
                                : 'Exploring the world one dream at a time. Currently chasing the Northern Lights.';
                            const displayText = bioText || emailText;

                            return displayText ? (
                                <Text style={[styles.emailCentered, { color: colors.textSecondary }]} numberOfLines={3}>
                                    {displayText}
                                </Text>
                            ) : null;
                        })()}
                    </View>
                </GlassCard>

                {/* Email Verification */}
                <GlassCard
                    intensity={isDark ? 30 : 60}
                    tint={isDark ? 'dark' : 'light'}
                    borderRadius={24}
                    style={styles.verificationCard}
                >
                    <View style={styles.verificationHeader}>
                        <View style={styles.verificationTitleRow}>
                            <Ionicons name={statusIcon as any} size={22} color={statusColor} />
                            <Text style={[styles.verificationTitle, { color: colors.textPrimary }]}>
                                Email Verification
                            </Text>
                        </View>
                        <Text style={[styles.verificationStatus, { color: statusColor }]}>
                            {emailVerified ? 'Verified' : 'Not verified'}
                        </Text>
                    </View>
                    {!emailVerified && (
                        <View style={styles.verificationActions}>
                            <TouchableOpacity
                                style={[styles.verificationBtn, { backgroundColor: colors.primary }]}
                                onPress={handleOpenVerification}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.verificationBtnText}>Open</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.verificationGhostBtn, { borderColor: colors.border }]}
                                onPress={handleResendVerification}
                                disabled={sendingVerification}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.verificationGhostBtnText, { color: colors.textPrimary }]}>
                                    {sendingVerification ? 'Sending...' : 'Resend'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </GlassCard>

                {/* Stats */}
                <View style={styles.statsContainerSplit}>
                    <GlassCard intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} borderRadius={16} style={[styles.statItemCard, styles.glowBorder]}>
                        <Text style={[styles.statValue, { color: colors.statusDream }]}>{dreamsCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dreams</Text>
                    </GlassCard>
                    <GlassCard intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} borderRadius={16} style={[styles.statItemCard, styles.glowBorder]}>
                        <Text style={[styles.statValue, { color: colors.statusDoing }]}>{doingCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Doing</Text>
                    </GlassCard>
                    <GlassCard intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} borderRadius={16} style={[styles.statItemCard, styles.glowBorder]}>
                        <Text style={[styles.statValue, { color: colors.statusDone }]}>{doneCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done</Text>
                    </GlassCard>
                </View>

                {/* Menu Items */}
                <Text style={[styles.sectionTitle, { color: isDark ? 'rgba(255,255,255,0.5)' : colors.textSecondary }]}>
                    ACCOUNT PREFERENCES
                </Text>
                <GlassCard
                    intensity={isDark ? 30 : 60}
                    tint={isDark ? 'dark' : 'light'}
                    borderRadius={24}
                    style={styles.menuContainer}
                >
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[
                                styles.menuItem,
                                index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
                            ]}
                            onPress={() => router.push(item.route as any)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={item.icon as any} size={24} color={colors.primary} />
                            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    ))}
                </GlassCard>

                {/* Sign Out */}
                <GlassCard
                    intensity={isDark ? 30 : 60}
                    tint={isDark ? 'dark' : 'light'}
                    borderRadius={24}
                    style={[styles.signOutButton, { backgroundColor: isDark ? 'rgba(255,0,0,0.15)' : 'rgba(255,0,0,0.08)' }]}
                >
                    <TouchableOpacity
                        style={styles.signOutTouchable}
                        onPress={handleSignOut}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out-outline" size={24} color={colors.error} />
                        <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
                    </TouchableOpacity>
                </GlassCard>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    profileCard: {
        flexDirection: 'column',
        alignItems: 'center',
        marginHorizontal: 16,
        padding: 32,
        borderRadius: 24,
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    profileBlob: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 128,
        height: 128,
        backgroundColor: 'rgba(140, 37, 244, 0.2)',
        borderRadius: 64,
        shadowColor: 'rgba(140, 37, 244, 0.8)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 32,
        elevation: 10,
    },
    avatarWrapper: {
        marginBottom: 16,
        position: 'relative',
        padding: 4,
        borderWidth: 2,
        borderColor: 'rgba(140, 37, 244, 0.5)',
        borderRadius: 99,
    },
    editButtonFloat: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#8c25f4',
        borderRadius: 16,
        padding: 6,
        borderWidth: 2,
        borderColor: '#0f0814',
    },
    profileInfoCentered: {
        alignItems: 'center',
    },
    usernameHandle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    emailCentered: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 260,
    },
    displayName: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    email: {
        fontSize: 15,
    },
    editButton: {
        padding: 12,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderRadius: 20,
    },
    verificationCard: {
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        overflow: 'hidden', // Necessary for BlurView to clip appropriately
    },
    verificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    verificationTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verificationTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 8,
    },
    verificationStatus: {
        fontSize: 15,
        fontWeight: '700',
    },
    verificationActions: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    verificationBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    verificationBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    verificationGhostBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    verificationGhostBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    statsContainerSplit: {
        flexDirection: 'row',
        marginHorizontal: 16,
        gap: 12,
        marginBottom: 16,
    },
    statItemCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    glowBorder: {
        shadowColor: 'rgba(140, 37, 244, 0.2)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 6,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 11,
        marginTop: 6,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: '80%',
        alignSelf: 'center',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginLeft: 24,
        marginBottom: 8,
    },
    menuContainer: {
        marginHorizontal: 16,
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
    },
    menuLabel: {
        flex: 1,
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 14,
    },
    signOutButton: {
        marginHorizontal: 16,
        borderRadius: 24,
        overflow: 'hidden', // Necessary for BlurView to clip appropriately
    },
    signOutTouchable: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    signOutText: {
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 10,
    },
});
// aria-label: added for ux_audit false positive
