/**
 * DreamSync Design System - Colors
 * Based on docs/design-system.md
 */

export const colors = {
    // ===== Light Theme =====
    light: {
        // Primary Palette
        primary: '#8c25f4',        // Deep Purple

        secondary: '#5EEAD4',      // Mint Teal
        secondaryLight: '#99F6E4', // Lighter teal
        secondaryDark: '#2DD4BF',  // Deeper teal

        accent: '#FB7185',         // Warm Coral (CTA)
        accentLight: '#FDA4AF',    // Lighter coral
        accentDark: '#F43F5E',     // Deeper coral

        // Background & Surfaces
        background: '#f7f5f8',     // Light Background
        surface: '#FFFFFF',        // Pure White (cards)
        surfaceElevated: '#FFFFFF', // Modals, sheets

        // Text
        textPrimary: '#1E293B',    // Deep Charcoal
        textSecondary: '#64748B',  // Slate
        textMuted: '#94A3B8',      // Light Slate
        textInverse: '#FFFFFF',    // On dark backgrounds

        // Borders & Dividers
        border: '#E2E8F0',         // Mist
        borderLight: '#F1F5F9',    // Lighter
        borderFocus: '#A78BFA',    // Primary focus ring

        // Status Colors
        statusDream: '#818CF8',    // Indigo (aspiration)
        statusDoing: '#FBBF24',    // Amber (in progress)
        statusDone: '#34D399',     // Emerald (achieved)

        // Semantic
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6',
    },

    // ===== Dark Theme =====
    dark: {
        // Primary Palette (Electric Purple)
        primary: '#8c25f4',
        primaryLight: '#D8B4FE',
        primaryDark: '#7E22CE',

        // Secondary Palette (Deep Teal / Cyan)
        secondary: '#2DD4BF',
        secondaryLight: '#5EEAD4',
        secondaryDark: '#0F766E',

        // Accent Palette (Vibrant Pink/Coral)
        accent: '#F43F5E',
        accentLight: '#FDA4AF',
        accentDark: '#BE123C',

        // Background & Surfaces (Midnight Ocean / Glass)
        background: '#0f0814',     // Dark Background
        surface: 'rgba(25, 16, 34, 0.6)',  // Glassmorphism base
        surfaceElevated: 'rgba(25, 16, 34, 0.8)', // Slightly more opaque glass

        // Text
        textPrimary: '#F8FAFC',    // Pure bright text
        textSecondary: '#94A3B8',  // Cool Gray
        textMuted: '#475569',      // Dimmer Slate
        textInverse: '#0B1120',    // On light backgrounds

        // Borders & Dividers
        border: 'rgba(140, 37, 244, 0.2)', // Glass border
        borderLight: 'rgba(255, 255, 255, 0.15)',
        borderFocus: '#A855F7',    // Primary focus ring

        // Status Colors (Vibrant Neon)
        statusDream: '#C084FC',    // Neon Purple
        statusDoing: '#FBBF24',    // Neon Amber
        statusDone: '#2DD4BF',     // Neon Teal

        // Semantic
        error: '#F43F5E',
        warning: '#FBBF24',
        success: '#10B981',
        info: '#3B82F6',
    },
};

// Gradient definitions
export const gradients = {
    // Dream Glow - for hero sections, premium feel
    dream: ['#A78BFA', '#818CF8', '#5EEAD4'],
    dreamAngle: 135,

    // Achievement - for celebrations, success states
    achieve: ['#34D399', '#5EEAD4'],
    achieveAngle: 135,

    // Warm CTA - for primary buttons, call-to-actions
    cta: ['#FB7185', '#F472B6'],
    ctaAngle: 135,

    // Sunset - warm, aspirational
    sunset: ['#FB7185', '#FBBF24'],
    sunsetAngle: 135,
};

// Category colors (for dream categories)
export const categoryColors = {
    travel: '#3B82F6',      // Blue
    skill: '#8B5CF6',       // Purple
    adventure: '#F97316',   // Orange
    career: '#10B981',      // Emerald
    health: '#EC4899',      // Pink
    relationship: '#EF4444', // Red
    finance: '#FBBF24',     // Amber
    creative: '#06B6D4',    // Cyan
    learning: '#6366F1',    // Indigo
    other: '#64748B',       // Slate
};

// Type for theme mode
export type ThemeMode = 'light' | 'dark';

// Helper to get current theme colors
export const getColors = (mode: ThemeMode) => colors[mode];
