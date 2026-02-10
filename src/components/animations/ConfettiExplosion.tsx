/**
 * ConfettiExplosion - Celebration Effect for Phase Completion
 * Features:
 * - Triggered when moving to "Done" phase
 * - 20-30 colored particles
 * - Gravity + random velocity
 * - Fade out after 2s
 */

import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = [
    '#FFD700', // Gold
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Orange
    '#98D8C8', // Mint
    '#F7B731', // Yellow
    '#5F27CD', // Purple
];

interface Particle {
    id: number;
    color: string;
    startX: number;
    startY: number;
    velocityX: number;
    velocityY: number;
    rotation: number;
}

interface ConfettiExplosionProps {
    trigger: boolean;
    originX?: number;
    originY?: number;
    particleCount?: number;
}

export function ConfettiExplosion({
    trigger,
    originX = SCREEN_WIDTH / 2,
    originY = SCREEN_HEIGHT / 3,
    particleCount = 25,
}: ConfettiExplosionProps) {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        if (trigger) {
            const newParticles: Particle[] = [];

            for (let i = 0; i < particleCount; i++) {
                newParticles.push({
                    id: Date.now() + i,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    startX: originX,
                    startY: originY,
                    velocityX: (Math.random() - 0.5) * 400, // -200 to 200
                    velocityY: -(Math.random() * 300 + 200), // -200 to -500 (upward)
                    rotation: Math.random() * 360,
                });
            }

            setParticles(newParticles);

            // Clear particles after animation
            setTimeout(() => setParticles([]), 2500);
        }
    }, [trigger]);

    if (particles.length === 0) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            {particles.map(particle => (
                <ConfettiParticle key={particle.id} particle={particle} />
            ))}
        </View>
    );
}

// Individual Confetti Particle
function ConfettiParticle({ particle }: { particle: Particle }) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const rotation = useSharedValue(particle.rotation);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);

    useEffect(() => {
        const gravity = 800; // pixels/s²
        const duration = 2000;

        // Horizontal movement
        translateX.value = withTiming(particle.velocityX * (duration / 1000), {
            duration,
            easing: Easing.out(Easing.quad),
        });

        // Vertical movement with gravity
        const finalY = particle.velocityY * (duration / 1000) + 0.5 * gravity * Math.pow(duration / 1000, 2);
        translateY.value = withTiming(finalY, {
            duration,
            easing: Easing.in(Easing.quad),
        });

        // Rotation
        rotation.value = withTiming(particle.rotation + 360 * 3, {
            duration,
            easing: Easing.linear,
        });

        // Fade out
        opacity.value = withTiming(0, {
            duration: duration * 0.8,
            easing: Easing.out(Easing.ease),
        });

        // Slight scale down
        scale.value = withTiming(0.5, {
            duration,
            easing: Easing.out(Easing.ease),
        });
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
                },
                particleStyle,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
    },
    particle: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 2,
    },
});
