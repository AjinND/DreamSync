import { auth } from '@/firebaseConfig';
import { UsersService } from '@/src/services/users';
import { useTheme } from '@/src/theme';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/src/types/notification';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/src/components/shared';
import { IconButton } from '@/src/components/ui';
import { ChevronLeft } from 'lucide-react-native';

type ThemeMode = 'system' | 'light' | 'dark';

export default function AppearanceScreen() {
    const { colors, themeMode, setThemeMode } = useTheme();
    const router = useRouter();
    const user = auth.currentUser;

    const handleSelect = async (mode: ThemeMode) => {
        try {
            await setThemeMode(mode);
            if (user) {
                const profile = await UsersService.getUserProfile(user.uid);
                const currentNotifs = profile?.settings?.notifications || DEFAULT_NOTIFICATION_PREFERENCES;
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
        } catch (error) {
            console.error('Error saving theme:', error);
            Alert.alert('Error', 'Failed to update appearance mode.');
        }
    };

    const Option = ({ mode, label, icon }: { mode: ThemeMode; label: string; icon: string }) => {
        const isSelected = themeMode === mode;
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

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <Header
                title="Appearance"
                leftAction={
                    <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" />
                }
            />

            <ScrollView style={{ flex: 1 }}>

            <View style={styles.section}>
                <Option mode="system" label="System Default" icon="settings-outline" />
                <Option mode="light" label="Light Mode" icon="sunny-outline" />
                <Option mode="dark" label="Dark Mode" icon="moon-outline" />
            </View>

            <Text style={[styles.note, { color: colors.textSecondary }]}>
                Changes apply immediately across the app.
            </Text>
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
