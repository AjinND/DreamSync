import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/src/theme';
import { BucketFillAnimation } from './BucketFillAnimation';
import { FallingSparkles } from '../animations/FallingSparkles';

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
  lg: { width: 120, height: 140 },
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
  const [fillProgress, setFillProgress] = useState<SharedValue<number> | null>(null);

  // Adjust particle count based on size
  const defaultParticleCount = size === 'lg' ? 15 : size === 'md' ? 8 : 0;
  const finalParticleCount = particleCount ?? defaultParticleCount;

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.width,
          height: dimensions.height,
        },
      ]}
    >
      {/* Bucket trapezoid shape */}
      <View
        style={[
          styles.bucket,
          {
            borderColor: isDark ? colors.primary : colors.textMuted,
            borderWidth: 2,
            backgroundColor: isDark ? 'rgba(167, 139, 250, 0.05)' : 'rgba(167, 139, 250, 0.03)',
            // Trapezoid effect using border
            borderTopWidth: 2,
            borderBottomWidth: 2,
            borderLeftWidth: 3,
            borderRightWidth: 3,
          },
          isDark && {
            shadowColor: '#A78BFA',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          },
        ]}
      >
        {/* Animated fill */}
        {showAnimation && (
          <BucketFillAnimation
            containerHeight={dimensions.height}
            duration={duration}
            onFillProgressCreated={setFillProgress}
          />
        )}

        {/* Falling sparkles */}
        {showAnimation && showSparkles && fillProgress && finalParticleCount > 0 && (
          <FallingSparkles
            active={true}
            fillProgress={fillProgress}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            particleCount={finalParticleCount}
            emissionRate={4}
          />
        )}

        {/* Custom content goes here */}
        {children}
      </View>

      {/* Bucket handle */}
      <View
        style={[
          styles.handle,
          {
            borderColor: isDark ? colors.primary : colors.textMuted,
            width: dimensions.width * 0.8,
            height: dimensions.height * 0.15,
            top: -dimensions.height * 0.08,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucket: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    // Create trapezoid shape
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  handle: {
    position: 'absolute',
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: 'transparent',
  },
});
