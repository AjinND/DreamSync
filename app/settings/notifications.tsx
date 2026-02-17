/**
 * DreamSync - Notification Settings
 * Expanded notification preferences with push master toggle and per-category controls
 */

import { auth } from '@/firebaseConfig';
import { NotificationService } from '@/src/services/notifications';
import { UsersService } from '@/src/services/users';
import { useTheme } from '@/src/theme';
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferences } from '@/src/types/notification';
import { isLegacySettings, migrateNotificationSettings } from '@/src/utils/settingsMigration';
import { Stack, useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/src/components/shared';
import { IconButton } from '@/src/components/ui';
import { ChevronLeft } from 'lucide-react-native';

export default function NotificationsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const user = auth.currentUser;
    const [isLoading, setIsLoading] = useState(true);
    const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        if (!user) return;
        try {
            const profile = await UsersService.getUserProfile(user.uid);
            const raw = profile?.settings?.notifications;
            if (raw) {
                if (isLegacySettings(raw as unknown as Record<string, unknown>)) {
                    // Migrate and persist
                    const migrated = migrateNotificationSettings(raw as any);
                    setPrefs(migrated);
                    await savePref(migrated);
                } else {
                    setPrefs({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...raw });
                }
            }
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const savePref = async (updated: NotificationPreferences) => {
        if (!user) return;
        const profile = await UsersService.getUserProfile(user.uid);
        await UsersService.updateUserProfile({
            settings: {
                notifications: updated,
                privacy: profile?.settings?.privacy,
                theme: profile?.settings?.theme,
            } as any,
        });
    };

    const toggleSetting = async (key: keyof NotificationPreferences) => {
        const newValue = !prefs[key];
        const updated = { ...prefs, [key]: newValue };
        setPrefs(updated); // Optimistic

        // When enabling push, ensure we have a token
        if (key === 'pushEnabled' && newValue) {
            try {
                const token = await NotificationService.ensureRegisteredPushToken();
                if (token) {
                    await NotificationService.storePushToken(token);
                }
            } catch (err) {
                console.error('Failed to register push token:', err);
            }
        }

        // When disabling push, remove token
        if (key === 'pushEnabled' && !newValue) {
            try {
                await NotificationService.removeStoredPushTokenFromServer();
            } catch (err) {
                console.error('Failed to remove push token:', err);
            }
        }

        try {
            await savePref(updated);
        } catch (error) {
            console.error('Failed to save notification setting:', error);
            setPrefs(prev => ({ ...prev, [key]: !newValue })); // Revert
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    const SettingRow = ({ label, value, onValueChange, description, disabled }: {
        label: string;
        value: boolean;
        onValueChange: () => void;
        description?: string;
        disabled?: boolean;
    }) => (
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.rowInfo}>
                <Text style={[styles.label, { color: disabled ? colors.textMuted : colors.textPrimary }]}>
                    {label}
                </Text>
                {description && (
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        {description}
                    </Text>
                )}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFF"
                disabled={disabled}
            />
        </View>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, styles.center, { backgroundColor: colors.background }]} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    const subDisabled = !prefs.pushEnabled;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <Header
                title="Notifications"
                leftAction={
                    <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" />
                }
            />

            <ScrollView style={{ flex: 1 }}>

            {/* Master Toggle */}
            <View style={styles.section}>
                <SettingRow
                    label="Push Notifications"
                    description="Enable or disable all push notifications"
                    value={prefs.pushEnabled}
                    onValueChange={() => toggleSetting('pushEnabled')}
                />
            </View>

            {/* Chat */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Chat</Text>

                <SettingRow
                    label="New Messages"
                    description="Notify when you receive a chat message"
                    value={prefs.chatMessages}
                    onValueChange={() => toggleSetting('chatMessages')}
                    disabled={subDisabled}
                />
                <SettingRow
                    label="Added to Group Chats"
                    description="Notify when you're added to a new chat"
                    value={prefs.chatAdded}
                    onValueChange={() => toggleSetting('chatAdded')}
                    disabled={subDisabled}
                />
            </View>

            {/* Journeys */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Journeys</Text>

                <SettingRow
                    label="Request Responses"
                    description="Notify when your join request is accepted or rejected"
                    value={prefs.journeyRequests}
                    onValueChange={() => toggleSetting('journeyRequests')}
                    disabled={subDisabled}
                />
                <SettingRow
                    label="Journey Updates"
                    description="Notify when a participant joins or the journey is updated"
                    value={prefs.journeyUpdates}
                    onValueChange={() => toggleSetting('journeyUpdates')}
                    disabled={subDisabled}
                />
            </View>

            {/* Community */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Community</Text>

                <SettingRow
                    label="Comments on Your Dreams"
                    description="Notify when someone comments on your public dreams"
                    value={prefs.communityComments}
                    onValueChange={() => toggleSetting('communityComments')}
                    disabled={subDisabled}
                />
                <SettingRow
                    label="Likes on Your Dreams"
                    description="Notify when someone likes your public dreams"
                    value={prefs.communityLikes}
                    onValueChange={() => toggleSetting('communityLikes')}
                    disabled={subDisabled}
                />
            </View>

            {/* Reminders */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Reminders</Text>

                <SettingRow
                    label="Due Date Reminders"
                    description="Get reminded when a dream's target date is approaching"
                    value={prefs.dueDateReminders}
                    onValueChange={() => toggleSetting('dueDateReminders')}
                    disabled={subDisabled}
                />
            </View>

            <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
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
        marginBottom: 8,
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
