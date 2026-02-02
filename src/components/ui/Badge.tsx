/**
 * DreamSync UI Components - Badge
 */

import { useTheme } from '@/src/theme';
import { StyleSheet, Text, View } from 'react-native';

interface BadgeProps {
    label: string;
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    size?: 'sm' | 'md';
}

export function Badge({
    label,
    variant = 'default',
    size = 'sm',
}: BadgeProps) {
    const { colors } = useTheme();

    const getColors = () => {
        switch (variant) {
            case 'primary':
                return { bg: colors.primary + '20', text: colors.primary };
            case 'secondary':
                return { bg: colors.secondary + '20', text: colors.secondary };
            case 'success':
                return { bg: colors.statusDone + '20', text: colors.statusDone };
            case 'warning':
                return { bg: colors.statusDoing + '20', text: colors.statusDoing };
            case 'error':
                return { bg: colors.error + '20', text: colors.error };
            default:
                return { bg: colors.border, text: colors.textSecondary };
        }
    };

    const { bg, text } = getColors();

    const sizeStyles = {
        sm: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 10 },
        md: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 12 },
    };

    const { paddingHorizontal, paddingVertical, fontSize } = sizeStyles[size];

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: bg, paddingHorizontal, paddingVertical },
            ]}
        >
            <Text style={[styles.text, { color: text, fontSize }]}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        borderRadius: 100,
        alignSelf: 'flex-start',
    },
    text: {
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
