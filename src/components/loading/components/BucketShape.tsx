import { useTheme } from '@/src/theme';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Easing,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';
import { FallingSparkles } from '../animations/FallingSparkles';
import { BucketFillAnimation } from './BucketFillAnimation';

interface BucketShapeProps {
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  showAnimation?: boolean;
  showSparkles?: boolean;
  duration?: number;
  particleCount?: number;
}

const SIZE_PRESETS = {
  sm: { width: 48, height: 56 },
  md: { width: 72, height: 84 },
  lg: { width: 120, height: 140 }, // Main loading size
};

export function BucketShape({
  size = 'lg',
  children,
  showAnimation = true,
  showSparkles = true,
  duration = 2000,
  particleCount,
}: BucketShapeProps) {
  const { colors, isDark } = useTheme();
  const dimensions = SIZE_PRESETS[size];
  const fillProgress = useSharedValue(0);

  // Animation logic moved here from BucketFillAnimation
  useEffect(() => {
    if (showAnimation) {
      fillProgress.value = withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1, // Infinite loop
        false // Don't reverse
      );
    }
  }, [showAnimation, duration]);

  // Adjust particle count based on size
  const defaultParticleCount = size === 'lg' ? 15 : size === 'md' ? 8 : 0;
  const finalParticleCount = particleCount ?? defaultParticleCount;

  // Colors
  const strokeColor = isDark ? colors.primary : colors.textMuted;
  const bucketBg = isDark ? 'rgba(167, 139, 250, 0.05)' : 'rgba(167, 139, 250, 0.03)';

  // SVG Paths (defined in 0-100 coordinate space)
  // Bucket Body: Tapered cylinder
  const bodyPath = `
    M 15 20
    L 22 90
    Q 24 98 32 98
    L 68 98
    Q 76 98 78 90
    L 85 20
  `;

  // Handle: Arc over the top
  const handlePath = `
    M 15 25
    C 15 -10, 85 -10, 85 25
  `;

  return (
    <View style={[styles.container, { width: dimensions.width, height: dimensions.height }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        style={styles.svg}
      >
        <Defs>
          <ClipPath id="bucketInnerClip">
            <Path d={bodyPath} />
          </ClipPath>
        </Defs>

        {/* Handle (Resulting visual layer: Behind or Integrated) */}
        <Path
          d={handlePath}
          stroke={strokeColor}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Bucket Background Fill */}
        <Path
          d={bodyPath}
          fill={bucketBg}
        />

        {/* Liquid Fill (Clipped) */}
        {showAnimation && (
          <G clipPath="url(#bucketInnerClip)">
            <BucketFillAnimation
              width={100}
              height={100}
              fillProgress={fillProgress}
            />
          </G>
        )}

        {/* Bucket Outline - Body */}
        <Path
          d={bodyPath}
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Bucket Rim (Ellipse) */}
        <Ellipse
          cx="50"
          cy="20"
          rx="35"
          ry="6"
          stroke={strokeColor}
          strokeWidth="3"
          fill="none"
        />
      </Svg>

      {/* Falling sparkles overlay */}
      {showAnimation && showSparkles && finalParticleCount > 0 && (
        <FallingSparkles
          active={true}
          fillProgress={fillProgress}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
          particleCount={finalParticleCount}
          emissionRate={4}
        />
      )}

      {/* Custom content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    // Ensure SVG takes full space
  }
});
