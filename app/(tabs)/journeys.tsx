/**
 * DreamSync - Journeys Tab (Placeholder)
 * Shared dreams, collaboration, group journeys
 */

import { useTheme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JourneysScreen() {
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Journeys</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Dreams you're achieving together
                </Text>
            </View>

            <View style={styles.placeholder}>
                <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
                    <Ionicons name="people-outline" size={48} color={colors.secondary} />
                </View>
                <Text style={[styles.placeholderTitle, { color: colors.textPrimary }]}>
                    No Journeys Yet
                </Text>
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                    When you join or invite others to achieve a dream together, it will appear here.
                </Text>
            </View>

            {/* Floating Chat Button (placeholder) */}
            <TouchableOpacity
                style={[styles.floatingButton, { backgroundColor: colors.accent }]}
                activeOpacity={0.8}
            >
                <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
            </TouchableOpacity>
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
    floatingButton: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
});
