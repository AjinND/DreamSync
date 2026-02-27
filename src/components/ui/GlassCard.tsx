import { useTheme } from '@/src/theme';
import { BlurTint, BlurView } from 'expo-blur';
import React, { useRef } from 'react';
import { Animated, Platform, StyleSheet, TouchableWithoutFeedback, View, ViewProps } from 'react-native';

interface GlassCardProps extends ViewProps {
    intensity?: number;
    tint?: BlurTint | 'default';
    fallbackColor?: string;
    borderRadius?: number;
    onPress?: () => void;
    animated?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    intensity = 15,
    tint = 'default',
    fallbackColor,
    borderRadius = 16,
    onPress,
    animated = false,
    ...rest
}) => {
    const { isDark } = useTheme();

    // Android < 31 fallback
    const isOldAndroid = Platform.OS === 'android' && Platform.Version < 31;

    // Default fallback color
    const androidFallback = fallbackColor || (isDark ? 'rgba(25, 16, 34, 0.95)' : 'rgba(255, 255, 255, 0.95)');
    const blurTint = tint === 'default' ? (isDark ? 'dark' : 'light') : tint;

    const baseStyle = [styles.card, { borderRadius }, style];

    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (!animated && !onPress) return;
        Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
            bounciness: 5
        }).start();
    };

    const handlePressOut = () => {
        if (!animated && !onPress) return;
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 5
        }).start();
    };

    const content = isOldAndroid ? (
        <View style={[baseStyle, { backgroundColor: androidFallback }]} {...rest}>
            {children}
        </View>
    ) : (
        <View style={[baseStyle, styles.overflowHidden]} {...rest}>
            <BlurView
                intensity={intensity}
                tint={blurTint as BlurTint}
                style={StyleSheet.absoluteFill}
            />
            {/* The border overlay for glass effect */}
            <View style={[StyleSheet.absoluteFill, styles.borderOverlay, { borderRadius }]} pointerEvents="none" />
            {children}
        </View>
    );

    if (onPress || animated) {
        return (
            <TouchableWithoutFeedback
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                accessibilityRole="button"
            >
                <Animated.View style={{ transform: [{ scale }] }}>
                    {content}
                </Animated.View>
            </TouchableWithoutFeedback>
        );
    }

    return content;
};

const styles = StyleSheet.create({
    card: {},
    overflowHidden: {
        overflow: 'hidden',
    },
    borderOverlay: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    }
});
