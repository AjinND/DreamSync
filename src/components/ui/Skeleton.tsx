import React, { useEffect } from 'react';
import { ColorValue, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { colors } from '../../theme';

interface Props {
    width?: number | string;
    height?: number | string;
    style?: ViewStyle;
    borderRadius?: number;
    color?: ColorValue;
}

export function Skeleton({ width = '100%', height = 20, style, borderRadius = 8, color = colors.slate[200] }: Props) {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 800 }),
                withTiming(0.3, { duration: 800 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width, height, borderRadius, backgroundColor: color },
                style,
                animatedStyle
            ] as any}
        />
    );
}

const styles = StyleSheet.create({
    skeleton: {
        overflow: 'hidden',
    },
});
