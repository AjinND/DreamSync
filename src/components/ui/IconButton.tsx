/**
 * DreamSync UI Components - IconButton
 */

import { useTheme } from '@/src/theme';
import { LucideIcon } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface IconButtonProps {
    icon: LucideIcon;
    onPress: () => void;
    size?: number;
    color?: string;
    variant?: 'default' | 'primary' | 'ghost';
    disabled?: boolean;
}

export function IconButton({
    icon: IconComponent,
    onPress,
    size = 24,
    color,
    variant = 'default',
    disabled = false,
}: IconButtonProps) {
    const { colors } = useTheme();

    const getBackgroundColor = () => {
        if (disabled) return colors.border;
        switch (variant) {
            case 'primary': return colors.primary;
            case 'ghost': return 'transparent';
            default: return colors.surface;
        }
    };

    const getIconColor = () => {
        if (disabled) return colors.textMuted;
        if (color) return color;
        switch (variant) {
            case 'primary': return '#FFFFFF';
            default: return colors.textSecondary;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor() },
                variant !== 'ghost' && styles.withShadow,
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
        >
            <IconComponent size={size} color={getIconColor()} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    withShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
});
