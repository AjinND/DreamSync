import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { WaveEffect } from '../animations/WaveEffect';

interface BucketFillAnimationProps {
  containerHeight: number;
  duration?: number;
  onFillProgressCreated?: (fillProgress: SharedValue<number>) => void;
}

// Dream Glow gradient colors
const GRADIENT_COLORS: readonly [string, string, ...string[]] = [
  '#5EEAD4', // Teal (bottom)
  '#6366F1', // Indigo (middle)
  '#A78BFA', // Lavender (top)
];

export function BucketFillAnimation({
  containerHeight,
  duration = 2000,
  onFillProgressCreated,
}: BucketFillAnimationProps) {
  const fillProgress = useSharedValue(0);

  useEffect(() => {
    // Pass fillProgress to parent
    onFillProgressCreated?.(fillProgress);

    fillProgress.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite loop
      false // Don't reverse
    );
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: fillProgress.value * containerHeight,
    };
  });

  return (
    <>
      <Animated.View style={[styles.fillContainer, animatedStyle]}>
        <LinearGradient
          colors={GRADIENT_COLORS}
          style={styles.gradient}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
        />
      </Animated.View>

      {/* Wave effect on top of liquid */}
      <WaveEffect
        fillProgress={fillProgress}
        containerHeight={containerHeight}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fillContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    width: '100%',
  },
});
