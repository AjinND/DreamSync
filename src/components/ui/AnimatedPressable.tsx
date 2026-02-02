import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface Props extends PressableProps {
    style?: StyleProp<ViewStyle>;
    scaleMin?: number;
    children: React.ReactNode;
}

const AnimatedPressableRoot = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({ children, style, scaleMin = 0.96, ...props }: Props) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = (e: any) => {
        scale.value = withSpring(scaleMin, { damping: 15, stiffness: 300 });
        props.onPressIn?.(e);
    };

    const handlePressOut = (e: any) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        props.onPressOut?.(e);
    };

    return (
        <AnimatedPressableRoot
            {...props}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[style, animatedStyle]}
        >
            {children}
        </AnimatedPressableRoot>
    );
}
