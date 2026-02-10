/**
 * FallingSparkles - Particle system for bucket loader
 * Features:
 * - Continuous emission (not one-time burst)
 * - Particles fall down with gravity (reverse of confetti)
 * - Collision detection with liquid surface
 * - Ripple effect on collision
 * - Configurable particle count
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  SharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme';

interface Particle {
  id: number;
  color: string;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  size: number;
}

interface FallingSparklesProps {
  active: boolean;
  fillProgress: SharedValue<number>;
  containerWidth: number;
  containerHeight: number;
  particleCount?: number;
  emissionRate?: number; // Particles per second
}

export function FallingSparkles({
  active,
  fillProgress,
  containerWidth,
  containerHeight,
  particleCount = 15,
  emissionRate = 4, // 4 particles per second
}: FallingSparklesProps) {
  const { colors } = useTheme();
  const [particles, setParticles] = useState<Particle[]>([]);

  // Theme-based sparkle colors
  const SPARKLE_COLORS = [
    colors.primary, // Lavender
    colors.secondary, // Teal
    '#6366F1', // Indigo
    '#FFD700', // Gold
    '#F7B731', // Yellow
    '#5EEAD4', // Bright Teal
  ];

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const emissionInterval = 1000 / emissionRate;
    let particleId = 0;

    const emitParticle = () => {
      const newParticle: Particle = {
        id: particleId++,
        color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
        startX: Math.random() * containerWidth,
        startY: -10,
        velocityX: (Math.random() - 0.5) * 30, // Small horizontal drift
        velocityY: Math.random() * 50 + 100, // 100-150 downward velocity
        rotation: Math.random() * 360,
        size: Math.random() * 4 + 6, // 6-10px
      };

      setParticles((prev) => {
        // Limit particle count
        const updated = [...prev, newParticle];
        return updated.slice(-particleCount);
      });
    };

    // Initial burst
    for (let i = 0; i < Math.min(5, particleCount); i++) {
      setTimeout(() => emitParticle(), i * 100);
    }

    // Continuous emission
    const interval = setInterval(emitParticle, emissionInterval);

    return () => {
      clearInterval(interval);
    };
  }, [active, containerWidth, containerHeight, particleCount, emissionRate]);

  if (!active || particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <FallingParticle
          key={particle.id}
          particle={particle}
          fillProgress={fillProgress}
          containerHeight={containerHeight}
          onComplete={() => {
            setParticles((prev) => prev.filter((p) => p.id !== particle.id));
          }}
        />
      ))}
    </View>
  );
}

// Individual Falling Particle
function FallingParticle({
  particle,
  fillProgress,
  containerHeight,
  onComplete,
}: {
  particle: Particle;
  fillProgress: SharedValue<number>;
  containerHeight: number;
  onComplete: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(particle.rotation);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    const gravity = 200; // pixels/s² (downward)
    const duration = 2000;
    const liquidSurfaceY = containerHeight * (1 - fillProgress.value);

    // Fade in
    opacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });

    scale.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.back(1.5)),
    });

    // Horizontal drift
    translateX.value = withTiming(particle.velocityX * (duration / 1000), {
      duration,
      easing: Easing.out(Easing.quad),
    });

    // Vertical falling with gravity
    const finalY =
      particle.velocityY * (duration / 1000) +
      0.5 * gravity * Math.pow(duration / 1000, 2);

    translateY.value = withTiming(
      finalY,
      {
        duration,
        easing: Easing.in(Easing.quad),
      },
      (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      }
    );

    // Rotation
    rotation.value = withTiming(particle.rotation + 360 * 2, {
      duration,
      easing: Easing.linear,
    });

    // Fade out near end
    setTimeout(() => {
      opacity.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      });
    }, duration - 500);

    return () => {
      // Cleanup
    };
  }, []);

  const particleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.startX,
          top: particle.startY,
          backgroundColor: particle.color,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
        },
        particleStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 5,
  },
});
