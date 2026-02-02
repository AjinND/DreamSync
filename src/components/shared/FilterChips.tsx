/**
 * DreamSync Shared Components - FilterChips
 */

import { useTheme } from '@/src/theme';
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
    const { colors } = useTheme();

    const ChipItem = ({ item }: { item: { value: T; label: string } }) => {
        const isSelected = item.value === selected;

        return (
            <TouchableOpacity
                style={[
                    styles.chip,
                    {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                    },
                ]}
                onPress={() => onSelect(item.value)}
                activeOpacity={0.7}
            >
                <Text
                    style={[
                        styles.chipText,
                        { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                >
                    {item.label}
                </Text>
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
        gap: 8,
    },
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 16,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 100,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
