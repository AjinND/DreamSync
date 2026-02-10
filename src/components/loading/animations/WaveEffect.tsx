import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  SharedValue,
  interpolate,
} from 'react-native-reanimated';

interface WaveEffectProps {
  fillProgress: SharedValue<number>;
  containerHeight: number;
  amplitude?: number;
  duration?: number;
}

export function WaveEffect({
  fillProgress,
  containerHeight,
  amplitude = 6,
  duration = 1500,
}: WaveEffectProps) {
  const wavePhase = useSharedValue(0);

  useEffect(() => {
    wavePhase.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [duration]);

  const wave1Style = useAnimatedStyle(() => {
    const yPosition = containerHeight - (fillProgress.value * containerHeight);
    const offset = interpolate(
      wavePhase.value,
      [0, 1],
      [0, -amplitude * 2]
    );

    return {
      position: 'absolute',
      top: yPosition + offset,
      left: 0,
      right: 0,
      height: amplitude * 2,
      opacity: fillProgress.value > 0.1 ? 0.3 : 0,
      transform: [
        { translateX: interpolate(wavePhase.value, [0, 1], [0, 20]) }
      ],
    };
  });

  const wave2Style = useAnimatedStyle(() => {
    const yPosition = containerHeight - (fillProgress.value * containerHeight);
    const offset = interpolate(
      wavePhase.value,
      [0, 1],
      [-amplitude, amplitude]
    );

    return {
      position: 'absolute',
      top: yPosition + offset,
      left: 0,
      right: 0,
      height: amplitude * 2,
      opacity: fillProgress.value > 0.1 ? 0.2 : 0,
      transform: [
        { translateX: interpolate(wavePhase.value, [0, 1], [20, 0]) }
      ],
    };
  });

  return (
    <>
      <Animated.View
        style={[
          styles.wave,
          wave1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.wave,
          wave2Style,
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wave: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 100,
  },
});
