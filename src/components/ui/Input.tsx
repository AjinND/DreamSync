/**
 * DreamSync UI Components - Input
 */

import { useTheme } from '@/src/theme';
import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIcon?: LucideIcon;
    rightIcon?: LucideIcon;
    onRightIconPress?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(({
    label,
    error,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    onRightIconPress,
    secureTextEntry,
    style,
    ...props
}, ref) => {
    const { colors } = useTheme();
    const [isSecure, setIsSecure] = useState(secureTextEntry);

    const getBorderColor = () => {
        if (error) return colors.error;
        return colors.border;
    };

    const PasswordIcon = isSecure ? Eye : EyeOff;

    return (
        <View style={styles.container}>
            {label && (
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {label}
                </Text>
            )}

            <View
                style={[
                    styles.inputContainer,
                    {
                        borderColor: getBorderColor(),
                        backgroundColor: colors.surface,
                    },
                ]}
            >
                {LeftIcon && (
                    <LeftIcon
                        size={20}
                        color={colors.textMuted}
                        style={styles.leftIcon}
                    />
                )}

                <TextInput
                    {...props}
                    ref={ref}
                    style={[
                        styles.input,
                        { color: colors.textPrimary },
                        LeftIcon && { paddingLeft: 0 },
                        (RightIcon || secureTextEntry) && { paddingRight: 0 },
                        style,
                    ]}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={isSecure}
                />

                {secureTextEntry && (
                    <TouchableOpacity
                        onPress={() => setIsSecure(!isSecure)}
                        style={styles.rightIcon}
                    >
                        <PasswordIcon size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}

                {RightIcon && !secureTextEntry && (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        style={styles.rightIcon}
                        disabled={!onRightIconPress}
                    >
                        <RightIcon size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {error && (
                <Text style={[styles.error, { color: colors.error }]}>
                    {error}
                </Text>
            )}
        </View>
    );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        minHeight: 48,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 12,
    },
    leftIcon: {
        marginRight: 12,
    },
    rightIcon: {
        marginLeft: 12,
        padding: 4,
    },
    error: {
        fontSize: 12,
        marginTop: 4,
    },
});
