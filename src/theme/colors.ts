/**
 * DreamSync Design System - Colors
 * Based on docs/design-system.md
 */

export const colors = {
    // ===== Light Theme =====
    light: {
        // Primary Palette
        primary: '#A78BFA',        // Soft Lavender
        primaryLight: '#C4B5FD',   // Lighter lavender
        primaryDark: '#8B5CF6',    // Deeper lavender

        secondary: '#5EEAD4',      // Mint Teal
        secondaryLight: '#99F6E4', // Lighter teal
        secondaryDark: '#2DD4BF',  // Deeper teal

        accent: '#FB7185',         // Warm Coral (CTA)
        accentLight: '#FDA4AF',    // Lighter coral
        accentDark: '#F43F5E',     // Deeper coral

        // Background & Surfaces
        background: '#FEFBF6',     // Warm Cream
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
        // Primary Palette (same hues, adjusted for dark)
        primary: '#A78BFA',
        primaryLight: '#C4B5FD',
        primaryDark: '#8B5CF6',

        secondary: '#5EEAD4',
        secondaryLight: '#99F6E4',
        secondaryDark: '#2DD4BF',

        accent: '#FB7185',
        accentLight: '#FDA4AF',
        accentDark: '#F43F5E',

        // Background & Surfaces
        background: '#0F172A',     // Deep Navy
        surface: '#1E293B',        // Slate
        surfaceElevated: '#334155', // Elevated slate

        // Text
        textPrimary: '#F1F5F9',    // Ghost White
        textSecondary: '#94A3B8',  // Cool Gray
        textMuted: '#64748B',      // Slate
        textInverse: '#1E293B',    // On light backgrounds

        // Borders & Dividers
        border: '#334155',         // Slate Dark
        borderLight: '#475569',    // Lighter slate
        borderFocus: '#A78BFA',    // Primary focus ring

        // Status Colors (same, high contrast)
        statusDream: '#818CF8',
        statusDoing: '#FBBF24',
        statusDone: '#34D399',

        // Semantic
        error: '#F87171',
        warning: '#FBBF24',
        success: '#34D399',
        info: '#60A5FA',
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
