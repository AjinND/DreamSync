/**
 * DreamSync - Community Tab (Placeholder)
 * Public feed, discovery, social features
 */

import { useTheme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CommunityScreen() {
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Community</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Discover dreams from others
                </Text>
            </View>

            <View style={styles.placeholder}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="globe-outline" size={48} color={colors.primary} />
                </View>
                <Text style={[styles.placeholderTitle, { color: colors.textPrimary }]}>
                    Coming Soon
                </Text>
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                    Share your dreams with the world and discover others on similar journeys.
                </Text>
            </View>
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
    subtitle: {
        fontSize: 16,
        marginTop: 4,
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    placeholderTitle: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 12,
    },
    placeholderText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
});
