/**
 * TagChips - Horizontal scrolling tag filter component
 */

import { useTheme } from '@/src/theme';
import { Category } from '@/src/types/item';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TagChipsProps {
    selectedCategory: Category | null;
    onSelectCategory: (category: Category | null) => void;
}

const CATEGORIES: { id: Category | 'all'; label: string; emoji: string }[] = [
    { id: 'all', label: 'All', emoji: '🌍' },
    { id: 'travel', label: 'Travel', emoji: '✈️' },
    { id: 'skill', label: 'Skills', emoji: '🎯' },
    { id: 'adventure', label: 'Adventure', emoji: '🏔️' },
    { id: 'creative', label: 'Creative', emoji: '🎨' },
    { id: 'career', label: 'Career', emoji: '💼' },
    { id: 'health', label: 'Health', emoji: '💪' },
    { id: 'personal', label: 'Personal', emoji: '✨' },
];

export function TagChips({ selectedCategory, onSelectCategory }: TagChipsProps) {
    const { colors } = useTheme();

    const handlePress = (category: Category | 'all') => {
        if (category === 'all') {
            onSelectCategory(null);
        } else {
            onSelectCategory(category);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {CATEGORIES.map((cat) => {
                    const isSelected = cat.id === 'all'
                        ? selectedCategory === null
                        : selectedCategory === cat.id;

                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor: isSelected ? colors.primary : colors.surface,
                                    borderColor: isSelected ? colors.primary : colors.border,
                                },
                            ]}
                            onPress={() => handlePress(cat.id)}
                        >
                            <Text style={styles.emoji}>{cat.emoji}</Text>
                            <Text
                                style={[
                                    styles.label,
                                    { color: isSelected ? '#FFF' : colors.textSecondary },
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    emoji: {
        fontSize: 14,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
    },
});
