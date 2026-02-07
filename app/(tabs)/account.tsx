/**
 * DreamSync - Account Tab
 * Profile, settings, user management
 */

import { auth } from '@/firebaseConfig';
import { UserAvatar } from '@/src/components/social/UserAvatar';
import { UsersService } from '@/src/services/users';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useChatStore } from '@/src/stores/useChatStore';
import { useTheme } from '@/src/theme';
import { UserProfile } from '@/src/types/social';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AccountScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const user = auth.currentUser;
    const { items, fetchItems } = useBucketStore();
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchItems();
            if (user?.uid) {
                UsersService.getUserProfile(user.uid).then(setProfile);
            }
        }, [user?.uid])
    );

    const dreamsCount = items.filter(i => i.phase === 'dream').length;
    const doingCount = items.filter(i => i.phase === 'doing').length;
    const doneCount = items.filter(i => i.phase === 'done').length;

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
                            useChatStore.getState().clear(); // Unsubscribe first
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
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Account</Text>
                </View>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
                    <UserAvatar
                        userId={user?.uid || ''}
                        name={profile?.displayName || user?.displayName || 'Dreamer'}
                        avatar={profile?.avatar || user?.photoURL || undefined}
                        size={60}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={[styles.displayName, { color: colors.textPrimary }]}>
                            {profile?.displayName || user?.displayName || 'Dreamer'}
                        </Text>
                        <Text style={[styles.email, { color: colors.textSecondary }]}>
                            {profile?.bio || user?.email}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => router.push('/settings/profile' as any)}
                    >
                        <Ionicons name="pencil" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.statusDream }]}>{dreamsCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dreams</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.statusDoing }]}>{doingCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Doing</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.statusDone }]}>{doneCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done</Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[
                                styles.menuItem,
                                index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                            ]}
                            onPress={() => router.push(item.route as any)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={item.icon as any} size={22} color={colors.textSecondary} />
                            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    style={[styles.signOutButton, { backgroundColor: colors.error + '15' }]}
                    onPress={handleSignOut}
                    activeOpacity={0.7}
                >
                    <Ionicons name="log-out-outline" size={22} color={colors.error} />
                    <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
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
    title: {
        fontSize: 32,
        fontWeight: '700',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 16,
    },
    displayName: {
        fontSize: 18,
        fontWeight: '600',
    },
    email: {
        fontSize: 14,
        marginTop: 2,
    },
    editButton: {
        padding: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: '100%',
    },
    menuContainer: {
        marginHorizontal: 16,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    menuLabel: {
        flex: 1,
        fontSize: 16,
        marginLeft: 12,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 16,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
