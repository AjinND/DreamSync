import React from 'react';
import Animated, {
  SharedValue,
  useAnimatedProps,
} from 'react-native-reanimated';
import { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

interface BucketFillProps {
  width: number;
  height: number;
  fillProgress: SharedValue<number>;
}

// Dream Glow gradient colors
const GRADIENT_COLORS = [
  '#5EEAD4', // Teal (bottom)
  '#6366F1', // Indigo (middle)
  '#06B6D4', // #0D9488 (top)
];

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export function BucketFillAnimation({
  width,
  height,
  fillProgress,
}: BucketFillProps) {
  
  const animatedProps = useAnimatedProps(() => {
    // Calculate the height of the fill based on progress
    // We draw from bottom up, so y moves from height to 0
    const fillHeight = fillProgress.value * height;
    const y = height - fillHeight;
    
    return {
      y,
      height: fillHeight,
    };
  });

  return (
    <>
      <Defs>
        <LinearGradient id="bucketFillGradient" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={GRADIENT_COLORS[0]} />
          <Stop offset="0.5" stopColor={GRADIENT_COLORS[1]} />
          <Stop offset="1" stopColor={GRADIENT_COLORS[2]} />
        </LinearGradient>
      </Defs>
      
      <AnimatedRect
        x="0"
        width={width}
        animatedProps={animatedProps}
        fill="url(#bucketFillGradient)"
      />
    </>
  );
}
