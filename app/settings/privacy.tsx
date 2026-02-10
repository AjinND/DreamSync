import { auth } from '@/firebaseConfig';
import { UsersService } from '@/src/services/users';
import { useTheme } from '@/src/theme';
import { UserSettings } from '@/src/types/social';
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

export default function PrivacyScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const user = auth.currentUser;
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<UserSettings['privacy']>({
        isPublicProfile: true,
        showCompletedDreams: true,
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        if (!user) return;
        try {
            const profile = await UsersService.getUserProfile(user.uid);
            if (profile?.settings?.privacy) {
                setSettings(profile.settings.privacy);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSetting = async (key: keyof UserSettings['privacy']) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);

        if (user) {
            try {
                const profile = await UsersService.getUserProfile(user.uid);
                const currentNotifs = profile?.settings?.notifications || {
                    comments: true, likes: true, mentions: true, journeyInvites: true
                };
                const currentTheme = profile?.settings?.theme || 'system';

                await UsersService.updateUserProfile({
                    settings: {
                        privacy: newSettings, // Update this
                        notifications: currentNotifs,
                        theme: currentTheme,
                    }
                } as any);

            } catch (error) {
                console.error('Failed to save setting:', error);
                setSettings(prev => ({ ...prev, [key]: !prev[key] }));
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
            <SafeAreaView style={[styles.container, styles.center, { backgroundColor: colors.background }]} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <Header
                title="Privacy"
                leftAction={
                    <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" />
                }
            />

            <ScrollView style={{ flex: 1 }}>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Visibility</Text>

                <SettingRow
                    label="Public Profile"
                    description="Allow others to find you and view your shared dreams"
                    value={settings.isPublicProfile}
                    onValueChange={() => toggleSetting('isPublicProfile')}
                />

                <SettingRow
                    label="Show Completed Dreams"
                    description="Show your completion history on your public profile"
                    value={settings.showCompletedDreams}
                    onValueChange={() => toggleSetting('showCompletedDreams')}
                />
            </View>

            <View style={styles.infoSection}>
                <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Data Privacy</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Your private dreams are never shared. Only dreams you explicitly mark as "Shared" or "Public" are visible to the community.
                </Text>
            </View>
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
    infoSection: {
        padding: 24,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 22,
    },
});
