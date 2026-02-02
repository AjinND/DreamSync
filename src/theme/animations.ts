/**
 * DreamSync Design System - Animation Constants
 * Based on docs/design-system.md
 */

// Duration in milliseconds
export const duration = {
    instant: 0,
    micro: 100,      // Micro-interactions (button press)
    fast: 200,       // State changes (hover, focus)
    normal: 300,     // Simple transitions (slide, fade)
    slow: 500,       // Complex entrances (modal, screen)
    elaborate: 800,  // Celebrations, achievements
} as const;

// Easing curves
export const easing = {
    // Standard
    linear: [0, 0, 1, 1] as const,

    // Entrances - decelerate, settle in
    easeOut: [0, 0, 0.2, 1] as const,

    // Exits - accelerate, exit
    easeIn: [0.4, 0, 1, 1] as const,

    // Emphasis - smooth, deliberate
    easeInOut: [0.4, 0, 0.2, 1] as const,

    // Playful - fun, bouncy
    spring: [0.34, 1.56, 0.64, 1] as const,

    // Gentle bounce
    bounce: [0.68, -0.55, 0.27, 1.55] as const,
} as const;

// Pre-built animation configs for Reanimated
export const animations = {
    // Screen transitions
    screenEnter: {
        duration: duration.normal,
        easing: easing.easeOut,
    },
    screenExit: {
        duration: duration.fast,
        easing: easing.easeIn,
    },

    // Modal
    modalEnter: {
        duration: duration.slow,
        easing: easing.spring,
    },
    modalExit: {
        duration: duration.fast,
        easing: easing.easeIn,
    },

    // Card press
    cardPress: {
        duration: duration.micro,
        easing: easing.easeOut,
        scale: 0.98,
    },

    // Button press
    buttonPress: {
        duration: duration.micro,
        easing: easing.easeOut,
        scale: 0.96,
    },

    // Like animation
    likeHeart: {
        duration: duration.slow,
        easing: easing.spring,
        scale: 1.3,
    },

    // Achievement celebration
    achievement: {
        duration: duration.elaborate,
        easing: easing.spring,
    },

    // Tab switch
    tabSwitch: {
        duration: duration.fast,
        easing: easing.easeInOut,
    },

    // Fade
    fadeIn: {
        duration: duration.normal,
        easing: easing.easeOut,
    },
    fadeOut: {
        duration: duration.fast,
        easing: easing.easeIn,
    },

    // Slide
    slideUp: {
        duration: duration.normal,
        easing: easing.easeOut,
    },
    slideDown: {
        duration: duration.fast,
        easing: easing.easeIn,
    },
} as const;

// Reduced motion config (for accessibility)
export const reducedMotion = {
    duration: 0,
    easing: easing.linear,
} as const;
