/**
 * CategoryTabs - Sticky animated tab bar for category filtering
 * Replaces TagChips with better performance and modern UX
 */

import { useTheme } from '@/src/theme';
import { Category } from '@/src/types/item';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategoryTabsProps {
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

const TAB_WIDTH = 90;
const TAB_GAP = 8;
const CONTAINER_PADDING = 16;

export const CategoryTabs = memo(function CategoryTabs({
    selectedCategory,
    onSelectCategory,
}: CategoryTabsProps) {
    const { colors } = useTheme();
    const scrollViewRef = useRef<ScrollView>(null);
    const underlinePosition = useSharedValue(0);

    const selectedIndex = useMemo(() => {
        if (selectedCategory === null) return 0;
        return CATEGORIES.findIndex((cat) => cat.id === selectedCategory);
    }, [selectedCategory]);

    // Initialize underline position
    useEffect(() => {
        const position = selectedIndex * (TAB_WIDTH + TAB_GAP);
        underlinePosition.value = position;

        // Scroll to selected tab on mount
        scrollViewRef.current?.scrollTo({
            x: Math.max(0, position - TAB_WIDTH),
            animated: false,
        });
    }, [selectedIndex, underlinePosition]);

    const handlePress = useCallback(
        (category: Category | 'all', index: number) => {
            // Calculate underline position (relative to ScrollView content)
            const position = index * (TAB_WIDTH + TAB_GAP);

            // Animate underline
            underlinePosition.value = withSpring(position, {
                damping: 20,
                stiffness: 200,
            });

            // Scroll to center the selected tab
            scrollViewRef.current?.scrollTo({
                x: Math.max(0, position - TAB_WIDTH),
                animated: true,
            });

            if (category === 'all') {
                onSelectCategory(null);
            } else {
                onSelectCategory(category);
            }
        },
        [onSelectCategory, underlinePosition]
    );

    const underlineStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: underlinePosition.value }],
    }));

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.innerContainer}>
                    <View style={styles.tabsWrapper}>
                        {CATEGORIES.map((cat, index) => {
                            const isSelected =
                                cat.id === 'all'
                                    ? selectedCategory === null
                                    : selectedCategory === cat.id;

                            return (
                                <CategoryTab
                                    key={cat.id}
                                    category={cat}
                                    isSelected={isSelected}
                                    onPress={() => handlePress(cat.id, index)}
                                    colors={colors}
                                />
                            );
                        })}
                    </View>
                    {/* Underline outside tabsWrapper to avoid gap interference */}
                    <Animated.View
                        style={[
                            styles.underline,
                            { backgroundColor: colors.primary },
                            underlineStyle,
                        ]}
                    />
                </View>
            </ScrollView>
        </View>
    );
});

// Separate component to prevent re-renders
const CategoryTab = memo(function CategoryTab({
    category,
    isSelected,
    onPress,
    colors,
}: {
    category: { id: Category | 'all'; label: string; emoji: string };
    isSelected: boolean;
    onPress: () => void;
    colors: any;
}) {
    return (
        <TouchableOpacity
            style={styles.tab}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={styles.emoji}>{category.emoji}</Text>
            <Text
                style={[
                    styles.label,
                    {
                        color: isSelected ? colors.textPrimary : colors.textMuted,
                        fontWeight: isSelected ? '600' : '500',
                    },
                ]}
            >
                {category.label}
            </Text>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    scrollContent: {
        paddingHorizontal: CONTAINER_PADDING,
    },
    innerContainer: {
        position: 'relative',
    },
    tabsWrapper: {
        flexDirection: 'row',
        gap: TAB_GAP,
    },
    tab: {
        width: TAB_WIDTH,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
    },
    emoji: {
        fontSize: 16,
    },
    label: {
        fontSize: 14,
    },
    underline: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: TAB_WIDTH,
        height: 2,
        borderRadius: 1,
    },
});
