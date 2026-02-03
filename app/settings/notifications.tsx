import { auth } from '@/firebaseConfig';
import { UsersService } from '@/src/services/users';
import { useTheme } from '@/src/theme';
import { UserSettings } from '@/src/types/social';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

export default function NotificationsScreen() {
    const { colors } = useTheme();
    const user = auth.currentUser;
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<UserSettings['notifications']>({
        comments: true,
        likes: true,
        mentions: true,
        journeyInvites: true,
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        if (!user) return;
        try {
            const profile = await UsersService.getUserProfile(user.uid);
            if (profile?.settings?.notifications) {
                setSettings(profile.settings.notifications);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSetting = async (key: keyof UserSettings['notifications']) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings); // Optimistic I

        if (user) {
            try {
                // We need to preserve other settings, so ideally we shouldn't overwrite blindly.
                // But for now, assuming we handle deep merge in service or here.
                // UsersService.updateUserProfile performs a merge at root level, but for nested maps usually it's tricky.
                // Firestore update({ "settings.notifications": ... }) is safer.
                // But let's assume we fetch generic settings first.

                // For safety, we should really fetch latest settings, merge, and save.
                // But since we just loaded it... context is okay.

                const profile = await UsersService.getUserProfile(user.uid);
                const currentPrivacy = profile?.settings?.privacy || {
                    isPublicProfile: true, showCompletedDreams: true
                };
                const currentTheme = profile?.settings?.theme || 'system';

                await UsersService.updateUserProfile({
                    settings: {
                        notifications: newSettings,
                        privacy: currentPrivacy,
                        theme: currentTheme,
                    }
                } as any);

            } catch (error) {
                console.error('Failed to save setting:', error);
                setSettings(prev => ({ ...prev, [key]: !prev[key] })); // Revert
                Alert.alert('Error', 'Failed to save changes');
            }
        }
    };

    const SettingRow = ({ label, value, onValueChange, description }: any) => (
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.rowInfo}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
                {description && <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'#FFF'}
            />
        </View>
    );

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                headerTitle: 'Notifications',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
                headerShadowVisible: false,
            }} />

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Social Interactions</Text>

                <SettingRow
                    label="New Comments"
                    description="Notify when someone comments on your dreams"
                    value={settings.comments}
                    onValueChange={() => toggleSetting('comments')}
                />

                <SettingRow
                    label="New Likes"
                    description="Notify when someone likes your dreams"
                    value={settings.likes}
                    onValueChange={() => toggleSetting('likes')}
                />

                <SettingRow
                    label="Mentions"
                    description="Notify when you are mentioned in a comment"
                    value={settings.mentions}
                    onValueChange={() => toggleSetting('mentions')}
                />
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Collaboration</Text>

                <SettingRow
                    label="Journey Invites"
                    description="Notify when someone invites you to a journey"
                    value={settings.journeyInvites}
                    onValueChange={() => toggleSetting('journeyInvites')}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    rowInfo: {
        flex: 1,
        paddingRight: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
    description: {
        fontSize: 13,
        marginTop: 4,
    },
});
