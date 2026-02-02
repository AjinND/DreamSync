/**
 * DreamSync Shared Components - LoadingState
 */

import { useTheme } from '@/src/theme';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface LoadingStateProps {
    message?: string;
    fullScreen?: boolean;
}

export function LoadingState({ message = 'Loading...', fullScreen = false }: LoadingStateProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, fullScreen && styles.fullScreen]}>
            <ActivityIndicator size="large" color={colors.primary} />
            {message && (
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                    {message}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    fullScreen: {
        flex: 1,
    },
    message: {
        fontSize: 14,
        marginTop: 16,
    },
});
