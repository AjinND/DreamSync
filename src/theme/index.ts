/**
 * DreamSync Design System - Main Export
 * 
 * Usage:
 * import { theme, useTheme } from '@/src/theme';
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

export type ThemePreference = 'system' | ThemeMode;
const THEME_MODE_STORAGE_KEY = 'THEME_MODE';

// Theme context type
export interface ThemeContextType {
    themeMode: ThemePreference;
    mode: ThemeMode;
    colors: typeof colors.light;
    shadows: ReturnType<typeof getShadows>;
    isDark: boolean;
    setThemeMode: (mode: ThemePreference) => Promise<void>;
    toggleTheme: (mode?: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemePreference>('system');

    useEffect(() => {
        let isMounted = true;

        const loadStoredTheme = async () => {
            try {
                const storedMode = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);
                if (!isMounted || !storedMode) return;

                if (storedMode === 'system' || storedMode === 'light' || storedMode === 'dark') {
                    setThemeModeState(storedMode);
                }
            } catch (error) {
                console.error('Failed to load theme mode:', error);
            }
        };

        loadStoredTheme();

        return () => {
            isMounted = false;
        };
    }, []);

    const setThemeMode = useCallback(async (mode: ThemePreference) => {
        setThemeModeState(mode);
        try {
            await AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
        } catch (error) {
            console.error('Failed to persist theme mode:', error);
        }
    }, []);

    const resolvedMode: ThemeMode = themeMode === 'system'
        ? (systemColorScheme === 'dark' ? 'dark' : 'light')
        : themeMode;
    const isDark = resolvedMode === 'dark';

    const toggleTheme = useCallback((nextMode?: ThemePreference) => {
        if (nextMode) {
            void setThemeMode(nextMode);
            return;
        }

        const fallbackNext: ThemePreference = resolvedMode === 'dark' ? 'light' : 'dark';
        void setThemeMode(fallbackNext);
    }, [resolvedMode, setThemeMode]);

    const value = useMemo<ThemeContextType>(() => ({
        themeMode,
        mode: resolvedMode,
        colors: getColors(resolvedMode),
        shadows: getShadows(isDark),
        isDark,
        setThemeMode,
        toggleTheme,
    }), [themeMode, resolvedMode, isDark, setThemeMode, toggleTheme]);

    return createElement(ThemeContext.Provider, { value }, children);
}

// Hook to get current theme colors based on selected appearance mode
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    const colorScheme = useColorScheme();

    if (context) {
        return context;
    }

    // Fallback for tests / legacy usage outside provider
    const mode: ThemeMode = colorScheme === 'dark' ? 'dark' : 'light';
    const isDark = mode === 'dark';
    return {
        themeMode: 'system',
        mode,
        colors: getColors(mode),
        shadows: getShadows(isDark),
        isDark,
        setThemeMode: async () => undefined,
        toggleTheme: () => undefined,
    };
};

// Default export
export default theme;
