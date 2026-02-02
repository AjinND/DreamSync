/**
 * DreamSync UI Components - Button
 */

import { useTheme } from '@/src/theme';
import { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
}: ButtonProps) {
    const { colors, isDark } = useTheme();

    const getBackgroundColor = () => {
        if (disabled) return colors.border;
        switch (variant) {
            case 'primary': return colors.accent;
            case 'secondary': return 'transparent';
            case 'ghost': return 'transparent';
            case 'danger': return colors.error;
            default: return colors.accent;
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.textMuted;
        switch (variant) {
            case 'primary': return '#FFFFFF';
            case 'secondary': return colors.primary;
            case 'ghost': return colors.textSecondary;
            case 'danger': return '#FFFFFF';
            default: return '#FFFFFF';
        }
    };

    const getBorderColor = () => {
        if (variant === 'secondary') return colors.primary;
        return 'transparent';
    };

    const sizeStyles = {
        sm: { height: 36, paddingHorizontal: 16, fontSize: 14, iconSize: 16 },
        md: { height: 44, paddingHorizontal: 24, fontSize: 16, iconSize: 20 },
        lg: { height: 52, paddingHorizontal: 32, fontSize: 18, iconSize: 22 },
    };

    const { height, paddingHorizontal, fontSize, iconSize } = sizeStyles[size];
    const textColor = getTextColor();

    return (
        <TouchableOpacity
            style={[
                styles.button,
                {
                    height,
                    paddingHorizontal,
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'secondary' ? 2 : 0,
                },
                fullWidth && styles.fullWidth,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={textColor} size="small" />
            ) : (
                <View style={styles.content}>
                    {Icon && iconPosition === 'left' && (
                        <Icon size={iconSize} color={textColor} style={styles.iconLeft} />
                    )}
                    <Text style={[styles.text, { fontSize, color: textColor }]}>
                        {title}
                    </Text>
                    {Icon && iconPosition === 'right' && (
                        <Icon size={iconSize} color={textColor} style={styles.iconRight} />
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullWidth: {
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        fontWeight: '600',
    },
    iconLeft: {
        marginRight: 8,
    },
    iconRight: {
        marginLeft: 8,
    },
});
