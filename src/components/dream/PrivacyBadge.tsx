/**
 * PrivacyBadge - Shows public/private status for dreams
 * Reusable badge component with icon + text
 */

import { useTheme } from '@/src/theme';
import { Globe, Lock } from 'lucide-react-native';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface PrivacyBadgeProps {
    isPublic: boolean;
    size?: 'small' | 'medium';
    style?: ViewStyle;
}

export function PrivacyBadge({ isPublic, size = 'medium', style }: PrivacyBadgeProps) {
    const { colors } = useTheme();

    const sizeConfig = {
        small: {
            iconSize: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            fontSize: 11,
            gap: 4,
        },
        medium: {
            iconSize: 14,
            paddingHorizontal: 10,
            paddingVertical: 6,
            fontSize: 12,
            gap: 6,
        },
    };

    const config = sizeConfig[size];
    const Icon = isPublic ? Globe : Lock;
    const bgColor = isPublic ? colors.primary + '20' : colors.textMuted + '20';
    const textColor = isPublic ? colors.primary : colors.textSecondary;

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: bgColor,
                    paddingHorizontal: config.paddingHorizontal,
                    paddingVertical: config.paddingVertical,
                    gap: config.gap,
                },
                style,
            ]}
        >
            <Icon size={config.iconSize} color={textColor} />
            <Text style={[styles.text, { color: textColor, fontSize: config.fontSize }]}>
                {isPublic ? 'Public' : 'Private'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 100,
        alignSelf: 'flex-start',
    },
    text: {
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
