/**
 * DreamSync Design System - Main Export
 * 
 * Usage:
 * import { theme, useTheme } from '@/src/theme';
 */

import { useColorScheme } from 'react-native';
import { animations, duration, easing, reducedMotion } from './animations';
import { categoryColors, colors, getColors, gradients, ThemeMode } from './colors';
import { borderRadius, getShadows, semanticSpacing, spacing } from './spacing';
import { fontFamily, fontSize, textStyles } from './typography';

// Re-export all
export * from './animations';
export * from './colors';
export * from './spacing';
export * from './typography';

// Re-export legacy theme for backwards compatibility
// TODO: Remove after migrating all screens
export {
    animations as legacyAnimations, colors as legacyColors,
    gradients as legacyGradients,
    theme as legacyTheme
} from './legacy';

// Unified theme object
export const theme = {
    colors,
    gradients,
    categoryColors,
    fontFamily,
    fontSize,
    textStyles,
    spacing,
    semanticSpacing,
    borderRadius,
    duration,
    easing,
    animations,
    reducedMotion,
};

// Theme context type
export interface ThemeContextType {
    mode: ThemeMode;
    colors: typeof colors.light;
    shadows: ReturnType<typeof getShadows>;
    isDark: boolean;
    toggleTheme: () => void;
}

// Hook to get current theme colors based on system preference
export const useTheme = (): ThemeContextType => {
    const colorScheme = useColorScheme();
    const mode: ThemeMode = colorScheme === 'dark' ? 'dark' : 'light';
    const isDark = mode === 'dark';

    return {
        mode,
        colors: getColors(mode),
        shadows: getShadows(isDark),
        isDark,
        toggleTheme: () => {
            // This is a placeholder - actual implementation needs state management
            console.warn('toggleTheme requires ThemeProvider context');
        },
    };
};

// Default export
export default theme;
