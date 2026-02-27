/**
 * DreamSync Shared Components - SearchBar
 * True Glassmorphism with BlurView
 */

import { useTheme } from '@/src/theme';
import { BlurView } from 'expo-blur';
import { Search, X } from 'lucide-react-native';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onSubmit?: () => void;
    autoFocus?: boolean;
}

export function SearchBar({
    value,
    onChangeText,
    placeholder = 'Search...',
    onSubmit,
    autoFocus = false,
}: SearchBarProps) {
    const { colors, isDark } = useTheme();

    return (
        <View style={styles.wrapper}>
            <BlurView
                intensity={isDark ? 30 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={[
                    styles.container,
                    {
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.05)',
                        borderWidth: 1,
                        backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)',
                    }
                ]}
            >
                <Search size={20} color={colors.textMuted} style={styles.icon} />

                <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    onSubmitEditing={onSubmit}
                    returnKeyType="search"
                    autoFocus={autoFocus}
                />

                {value.length > 0 && (
                    <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton} activeOpacity={0.7}>
                        <X size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: 'hidden', // Essential for clipping BlurView on Android/iOS
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 48, // Slightly taller for better touch area
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 10,
    },
    clearButton: {
        padding: 6,
    },
});
