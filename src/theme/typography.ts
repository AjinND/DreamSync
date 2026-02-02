/**
 * DreamSync Design System - Typography
 * Based on docs/design-system.md
 * 
 * Primary: Satoshi (Display/Headings)
 * Secondary: General Sans (Body)
 * Fallback: System fonts
 */

import { Platform, TextStyle } from 'react-native';

// Font family definitions
export const fontFamily = {
    // Display/Headings - Satoshi (or DM Sans fallback)
    display: Platform.select({
        ios: 'Satoshi-Bold',
        android: 'Satoshi-Bold',
        default: 'DM Sans',
    }),
    displayMedium: Platform.select({
        ios: 'Satoshi-Medium',
        android: 'Satoshi-Medium',
        default: 'DM Sans',
    }),

    // Body - General Sans (or Inter fallback)
    body: Platform.select({
        ios: 'GeneralSans-Regular',
        android: 'GeneralSans-Regular',
        default: 'Inter',
    }),
    bodyMedium: Platform.select({
        ios: 'GeneralSans-Medium',
        android: 'GeneralSans-Medium',
        default: 'Inter',
    }),
    bodySemibold: Platform.select({
        ios: 'GeneralSans-Semibold',
        android: 'GeneralSans-Semibold',
        default: 'Inter',
    }),

    // Mono (for code, numbers)
    mono: Platform.select({
        ios: 'JetBrainsMono-Regular',
        android: 'JetBrainsMono-Regular',
        default: 'monospace',
    }),
};

// Font sizes with line heights
export const fontSize = {
    // Display - Hero headlines
    displayXl: {
        fontSize: 48,
        lineHeight: 52.8, // 1.1
    },
    display: {
        fontSize: 36,
        lineHeight: 43.2, // 1.2
    },

    // Headings
    headingLg: {
        fontSize: 28,
        lineHeight: 36.4, // 1.3
    },
    heading: {
        fontSize: 24,
        lineHeight: 31.2, // 1.3
    },
    headingSm: {
        fontSize: 20,
        lineHeight: 28, // 1.4
    },

    // Body
    bodyLg: {
        fontSize: 18,
        lineHeight: 28.8, // 1.6
    },
    body: {
        fontSize: 16,
        lineHeight: 25.6, // 1.6
    },
    bodySm: {
        fontSize: 14,
        lineHeight: 21, // 1.5
    },

    // Caption
    caption: {
        fontSize: 12,
        lineHeight: 16.8, // 1.4
    },
};

// Pre-built text styles
export const textStyles: Record<string, TextStyle> = {
    // Display
    displayXl: {
        fontFamily: fontFamily.display,
        ...fontSize.displayXl,
        fontWeight: '700',
    },
    display: {
        fontFamily: fontFamily.display,
        ...fontSize.display,
        fontWeight: '700',
    },

    // Headings
    headingLg: {
        fontFamily: fontFamily.display,
        ...fontSize.headingLg,
        fontWeight: '700',
    },
    heading: {
        fontFamily: fontFamily.display,
        ...fontSize.heading,
        fontWeight: '600',
    },
    headingSm: {
        fontFamily: fontFamily.displayMedium,
        ...fontSize.headingSm,
        fontWeight: '600',
    },

    // Body
    bodyLg: {
        fontFamily: fontFamily.body,
        ...fontSize.bodyLg,
        fontWeight: '400',
    },
    body: {
        fontFamily: fontFamily.body,
        ...fontSize.body,
        fontWeight: '400',
    },
    bodyMedium: {
        fontFamily: fontFamily.bodyMedium,
        ...fontSize.body,
        fontWeight: '500',
    },
    bodySm: {
        fontFamily: fontFamily.body,
        ...fontSize.bodySm,
        fontWeight: '400',
    },
    bodySmMedium: {
        fontFamily: fontFamily.bodyMedium,
        ...fontSize.bodySm,
        fontWeight: '500',
    },

    // Caption
    caption: {
        fontFamily: fontFamily.body,
        ...fontSize.caption,
        fontWeight: '400',
    },
    captionMedium: {
        fontFamily: fontFamily.bodyMedium,
        ...fontSize.caption,
        fontWeight: '500',
    },

    // Button (special)
    button: {
        fontFamily: fontFamily.bodySemibold,
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    buttonSm: {
        fontFamily: fontFamily.bodySemibold,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
};
