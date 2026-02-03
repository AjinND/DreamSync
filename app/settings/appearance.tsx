import { auth } from '@/firebaseConfig';
import { UsersService } from '@/src/services/users';
import { useTheme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type ThemeMode = 'system' | 'light' | 'dark';

export default function AppearanceScreen() {
    const { colors } = useTheme();
    const user = auth.currentUser;
    const [selectedMode, setSelectedMode] = useState<ThemeMode>('system');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            // Try load from storage first
            const localTheme = await AsyncStorage.getItem('THEME_MODE');
            if (localTheme) {
                setSelectedMode(localTheme as ThemeMode);
            } else if (user) {
                // Determine from profile if not local
                const profile = await UsersService.getUserProfile(user.uid);
                if (profile?.settings?.theme) {
                    setSelectedMode(profile.settings.theme);
                }
            }
        } catch (error) {
            console.error('Failed to load theme:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = async (mode: ThemeMode) => {
        setSelectedMode(mode);
        try {
            await AsyncStorage.setItem('THEME_MODE', mode);
            if (user) {
                const profile = await UsersService.getUserProfile(user.uid);
                const currentNotifs = profile?.settings?.notifications || {
                    comments: true, likes: true, mentions: true, journeyInvites: true
                };
                const currentPrivacy = profile?.settings?.privacy || {
                    isPublicProfile: true, showCompletedDreams: true
                };

                await UsersService.updateUserProfile({
                    settings: {
                        theme: mode,
                        notifications: currentNotifs,
                        privacy: currentPrivacy
                    }
                } as any);
            }
            // In a real app with ThemeProvider, we would call toggleTheme(mode) here.
            Alert.alert('Theme Updated', 'Please restart the app to apply the theme change fully.');
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    const Option = ({ mode, label, icon }: { mode: ThemeMode; label: string; icon: string }) => {
        const isSelected = selectedMode === mode;
        return (
            <TouchableOpacity
                style={[styles.option, { backgroundColor: colors.surface }]}
                onPress={() => handleSelect(mode)}
                activeOpacity={0.8}
            >
                <View style={styles.optionContent}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                        <Ionicons name={icon as any} size={24} color={colors.textPrimary} />
                    </View>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
                </View>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

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
                headerTitle: 'Appearance',
                headerTintColor: colors.textPrimary,
                headerStyle: { backgroundColor: colors.background },
                headerShadowVisible: false,
            }} />

            <View style={styles.section}>
                <Option mode="system" label="System Default" icon="settings-outline" />
                <Option mode="light" label="Light Mode" icon="sunny-outline" />
                <Option mode="dark" label="Dark Mode" icon="moon-outline" />
            </View>

            <Text style={[styles.note, { color: colors.textSecondary }]}>
                Note: Theme changes may require an app restart to take full effect.
            </Text>
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
        padding: 16,
        gap: 12,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
    },
    note: {
        textAlign: 'center',
        marginTop: 24,
        fontSize: 13,
        paddingHorizontal: 32,
    },
});
