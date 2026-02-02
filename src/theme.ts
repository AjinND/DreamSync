import { StyleSheet } from 'react-native';

export const colors = {
    dream: {
        light: '#A5B4FC',
        default: '#6366F1',
        dark: '#4338CA',
        cosmic: '#2D1B69',
        glow: '#818CF8',
    },
    doing: {
        light: '#FDBA74',
        default: '#F97316',
        dark: '#EA580C',
        sunrise: '#FF6B35',
        energy: '#FFB347',
    },
    done: {
        light: '#86EFAC',
        default: '#22C55E',
        dark: '#15803D',
        celebration: '#10B981',
        gold: '#FBBF24',
    },
    slate: {
        50: '#F8FAFC',
        100: '#F1F5F9',
        200: '#E2E8F0',
        300: '#CBD5E1',
        400: '#94A3B8',
        500: '#64748B',
        600: '#475569',
        700: '#334155',
        800: '#1E293B',
        900: '#0F172A',
        950: '#020617',
    },
    white: '#FFFFFF',
    black: '#000000',
    indigo: {
        50: '#EEF2FF',
        100: '#E0E7FF',
        200: '#C7D2FE',
        300: '#A5B4FC',
        400: '#818CF8',
        500: '#6366F1',
        600: '#4F46E5',
        700: '#4338CA',
        800: '#3730A3',
        900: '#312E81',
    },
};

// Gradient definitions
export const gradients = {
    dream: {
        colors: ['#1E1B4B', '#312E81', '#4338CA'],
        locations: [0, 0.5, 1],
    },
    doing: {
        colors: ['#FF6B35', '#F97316', '#FBBF24'],
        locations: [0, 0.5, 1],
    },
    done: {
        colors: ['#10B981', '#22C55E', '#FBBF24'],
        locations: [0, 0.65, 1],
    },
    background: {
        colors: ['#F8FAFC', '#E0E7FF'],
        locations: [0, 1],
    },
};

export const theme = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.slate[50],
    },
    text: {
        color: colors.slate[900],
    },
    textSecondary: {
        color: colors.slate[500],
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    cardElevated: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 5,
    },
});

// Animation configurations
export const animations = {
    spring: {
        damping: 15,
        stiffness: 150,
        mass: 1,
    },
    springBouncy: {
        damping: 10,
        stiffness: 100,
        mass: 1,
    },
    timing: {
        duration: 300,
    },
};
