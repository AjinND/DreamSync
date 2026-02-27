/**
 * CategoryTabs - Sticky animated tab bar for category filtering
 * Premium Pill Design with Glassmorphism
 */

import { useTheme } from '@/src/theme';
import { Category } from '@/src/types/item';
import { BlurView } from 'expo-blur';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

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

// Wider to accommodate pill shape padding
const TAB_WIDTH = 110;
const TAB_GAP = 10;
const CONTAINER_PADDING = 16;
const TAB_HEIGHT = 42;

export const CategoryTabs = memo(function CategoryTabs({
    selectedCategory,
    onSelectCategory,
}: CategoryTabsProps) {
    const { colors, isDark } = useTheme();
    const scrollViewRef = useRef<ScrollView>(null);
    const indicatorPosition = useSharedValue(0);

    const selectedIndex = useMemo(() => {
        if (selectedCategory === null) return 0;
        return CATEGORIES.findIndex((cat) => cat.id === selectedCategory);
    }, [selectedCategory]);

    // Initialize indicator position
    useEffect(() => {
        const position = selectedIndex * (TAB_WIDTH + TAB_GAP);
        indicatorPosition.value = position;

        // Scroll to selected tab on mount
        scrollViewRef.current?.scrollTo({
            x: Math.max(0, position - TAB_WIDTH / 2),
            animated: false,
        });
    }, [selectedIndex, indicatorPosition]);

    const handlePress = useCallback(
        (category: Category | 'all', index: number) => {
            const position = index * (TAB_WIDTH + TAB_GAP);

            // Animate pill background
            indicatorPosition.value = withSpring(position, {
                damping: 20,
                stiffness: 250,
                mass: 0.8,
            });

            // Smooth scroll center
            scrollViewRef.current?.scrollTo({
                x: Math.max(0, position - TAB_WIDTH / 2),
                animated: true,
            });

            if (category === 'all') {
                onSelectCategory(null);
            } else {
                onSelectCategory(category);
            }
        },
        [onSelectCategory, indicatorPosition]
    );

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorPosition.value }],
    }));

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <BlurView
                    intensity={isDark ? 20 : 50}
                    tint={isDark ? 'dark' : 'light'}
                    style={[styles.innerContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)', borderRadius: TAB_HEIGHT / 2, padding: 4 }]}
                >

                    {/* Animated Pill Background */}
                    <Animated.View
                        style={[
                            styles.activePillIndicator,
                            {
                                backgroundColor: colors.primary,
                                shadowColor: colors.primary,
                            },
                            indicatorStyle,
                        ]}
                    />

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
                </BlurView>
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
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                    },
                ]}
                numberOfLines={1}
            >
                {category.label}
            </Text>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: CONTAINER_PADDING,
    },
    innerContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden', // required for BlurView border radii
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    tabsWrapper: {
        flexDirection: 'row',
        gap: TAB_GAP,
    },
    activePillIndicator: {
        position: 'absolute',
        top: 4,      // compensate for padding
        left: 4,     // compensate for padding
        width: TAB_WIDTH,
        height: TAB_HEIGHT,
        borderRadius: TAB_HEIGHT / 2,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },
    tab: {
        width: TAB_WIDTH,
        height: TAB_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 12,
        // Z-index ensures touches and text render above the absolute pill
        zIndex: 1,
    },
    emoji: {
        fontSize: 16,
    },
    label: {
        fontSize: 14,
        letterSpacing: 0.3,
    },
});
