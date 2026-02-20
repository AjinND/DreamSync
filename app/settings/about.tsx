import { useTheme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/src/components/shared';
import { IconButton } from '@/src/components/ui';
import { ChevronLeft } from 'lucide-react-native';

export default function AboutScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const version = Constants.expoConfig?.version || '1.0.0';

    const handleLink = (url: string) => {
        Linking.openURL(url);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <Header
                title="About"
                leftAction={
                    <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" accessibilityLabel="Go back" />
                }
            />

            <ScrollView contentContainerStyle={styles.container}>

            <View style={styles.logoSection}>
                <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
                    <Ionicons name="sparkles" size={48} color="#FFF" />
                </View>
                <Text style={[styles.appName, { color: colors.textPrimary }]}>DreamSync</Text>
                <Text style={[styles.version, { color: colors.textSecondary }]}>Version {version}</Text>
            </View>

            <View style={styles.infoSection}>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    DreamSync is designed to help you capture your dreams, plan your journey, and find inspiration from a community of dreamers.
                </Text>
            </View>

            <View style={styles.linksSection}>
                <TouchableOpacity
                    style={[styles.linkItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleLink('https://dreamsync.app/terms')}
                >
                    <Text style={[styles.linkText, { color: colors.textPrimary }]}>Terms of Service</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.linkItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleLink('https://dreamsync.app/privacy')}
                >
                    <Text style={[styles.linkText, { color: colors.textPrimary }]}>Privacy Policy</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.linkItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleLink('https://dreamsync.app')}
                >
                    <Text style={[styles.linkText, { color: colors.textPrimary }]}>Website</Text>
                    <Ionicons name="open-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    © 2024 DreamSync. All rights reserved.
                </Text>
            </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 20,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        transform: [{ rotate: '-10deg' }],
    },
    appName: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    version: {
        fontSize: 16,
    },
    infoSection: {
        marginBottom: 40,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    linksSection: {
        marginBottom: 40,
    },
    linkItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    linkText: {
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        alignItems: 'center',
        marginTop: 'auto',
    },
    footerText: {
        fontSize: 12,
    },
});
