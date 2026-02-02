/**
 * DreamSync Shared Components - Header
 */

import { useTheme } from '@/src/theme';
import { StyleSheet, Text, View } from 'react-native';

interface HeaderProps {
    title: string;
    subtitle?: string;
    leftAction?: React.ReactNode;
    rightAction?: React.ReactNode;
    transparent?: boolean;
}

export function Header({
    title,
    subtitle,
    leftAction,
    rightAction,
    transparent = false,
}: HeaderProps) {
    const { colors } = useTheme();

    return (
        <View
            style={[
                styles.container,
                !transparent && { backgroundColor: colors.background },
            ]}
        >
            <View style={styles.leftSection}>
                {leftAction}
            </View>

            <View style={styles.centerSection}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {subtitle}
                    </Text>
                )}
            </View>

            <View style={styles.rightSection}>
                {rightAction}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 56,
    },
    leftSection: {
        width: 44,
        alignItems: 'flex-start',
    },
    centerSection: {
        flex: 1,
        alignItems: 'center',
    },
    rightSection: {
        width: 44,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
});
