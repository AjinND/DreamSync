/**
 * DreamSync Shared Components - FilterChips
 * True Glassmorphism with BlurView for inactive states
 */

import { useTheme } from '@/src/theme';
import { BlurView } from 'expo-blur';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FilterChipsProps<T extends string> {
    options: { value: T; label: string }[];
    selected: T;
    onSelect: (value: T) => void;
    scrollable?: boolean;
}

export function FilterChips<T extends string>({
    options,
    selected,
    onSelect,
    scrollable = true,
}: FilterChipsProps<T>) {
    const { colors, isDark } = useTheme();

    const ChipItem = ({ item }: { item: { value: T; label: string } }) => {
        const isSelected = item.value === selected;

        return (
            <TouchableOpacity
                onPress={() => onSelect(item.value)}
                activeOpacity={0.8}
                style={[
                    styles.chipContainer,
                    isSelected && {
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        elevation: 6,
                    }
                ]}
            >
                {isSelected ? (
                    <View style={[styles.chipBase, { backgroundColor: colors.primary, borderColor: colors.primary, borderWidth: 1 }]}>
                        <Text style={[styles.chipText, { color: '#FFFFFF', fontWeight: '700' }]}>
                            {item.label}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.blurWrapper}>
                        <BlurView
                            intensity={isDark ? 20 : 50}
                            tint={isDark ? 'dark' : 'light'}
                            style={[
                                styles.chipBase,
                                {
                                    backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.05)',
                                    borderWidth: 1,
                                }
                            ]}
                        >
                            <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                                {item.label}
                            </Text>
                        </BlurView>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (scrollable) {
        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
            >
                {options.map((item) => (
                    <ChipItem key={item.value} item={item} />
                ))}
            </ScrollView>
        );
    }

    return (
        <View style={styles.container}>
            {options.map((item) => (
                <ChipItem key={item.value} item={item} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        paddingHorizontal: 16,
        gap: 10,
        paddingBottom: 4, // Allow room for shadow
    },
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 16,
    },
    chipContainer: {
        // Wrapper for handling touch and shadow exclusively
    },
    blurWrapper: {
        borderRadius: 100,
        overflow: 'hidden',
    },
    chipBase: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
});
