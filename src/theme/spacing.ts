/**
 * DreamSync Design System - Spacing
 * Based on 8-point grid system
 */

// Base spacing unit
const BASE = 8;

// Spacing scale
export const spacing = {
    // Micro
    px: 1,
    '0.5': BASE * 0.5,  // 4px

    // Standard scale
    '1': BASE * 1,      // 8px
    '1.5': BASE * 1.5,  // 12px
    '2': BASE * 2,      // 16px
    '2.5': BASE * 2.5,  // 20px
    '3': BASE * 3,      // 24px
    '4': BASE * 4,      // 32px
    '5': BASE * 5,      // 40px
    '6': BASE * 6,      // 48px
    '8': BASE * 8,      // 64px
    '10': BASE * 10,    // 80px
    '12': BASE * 12,    // 96px
    '16': BASE * 16,    // 128px
} as const;

// Semantic spacing aliases
export const semanticSpacing = {
    // Component internal padding
    cardPadding: spacing['2'],         // 16px
    cardPaddingLg: spacing['3'],       // 24px
    buttonPaddingX: spacing['3'],      // 24px
    buttonPaddingY: spacing['1.5'],    // 12px
    inputPadding: spacing['1.5'],      // 12px

    // Gaps between elements
    iconGap: spacing['1'],             // 8px
    itemGap: spacing['1.5'],           // 12px
    sectionGap: spacing['3'],          // 24px
    screenPadding: spacing['2'],       // 16px
    screenPaddingLg: spacing['3'],     // 24px

    // List spacing
    listItemGap: spacing['1.5'],       // 12px
    gridGap: spacing['2'],             // 16px

    // Navigation
    tabBarHeight: 80,
    headerHeight: 56,
    statusBarOffset: 44,               // iOS status bar
} as const;

// Border radius
export const borderRadius = {
    none: 0,
    sm: 8,           // Inputs, small buttons
    md: 12,          // Buttons, cards
    lg: 16,          // Large cards
    xl: 24,          // Modals, bottom sheets
    full: 9999,      // Avatars, pills
} as const;

// Shadows (light mode)
export const shadowsLight = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.16,
        shadowRadius: 48,
        elevation: 12,
    },
} as const;

// Shadows (dark mode - uses glows)
export const shadowsDark = {
    none: shadowsLight.none,
    sm: {
        shadowColor: '#A78BFA',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 1,
    },
    md: {
        shadowColor: '#A78BFA',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 4,
    },
    lg: {
        shadowColor: '#A78BFA',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 32,
        elevation: 8,
    },
    xl: {
        shadowColor: '#A78BFA',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 48,
        elevation: 12,
    },
} as const;

// Helper to get shadows based on theme
export const getShadows = (isDark: boolean) => isDark ? shadowsDark : shadowsLight;
