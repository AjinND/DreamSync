/**
 * DreamSync Toast Notification Component
 *
 * Lightweight in-app toast for user feedback (success, error, info, warning).
 * Renders at the top of the screen with auto-dismiss and slide animation.
 */

import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    message: string;
    variant?: ToastVariant;
    duration?: number;
}

interface ToastItemProps extends ToastMessage {
    onDismiss: (id: string) => void;
}

function ToastItem({ id, message, variant = 'info', duration = 3000, onDismiss }: ToastItemProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Slide in
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 10,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto-dismiss
        const timer = setTimeout(() => dismissToast(), duration);
        return () => clearTimeout(timer);
    }, []);

    const dismissToast = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onDismiss(id));
    };

    const getVariantColors = () => {
        switch (variant) {
            case 'success': return { bg: '#D1FAE5', border: '#10B981', icon: '#10B981' };
            case 'error':   return { bg: '#FEE2E2', border: '#EF4444', icon: '#EF4444' };
            case 'warning': return { bg: '#FEF3C7', border: '#F59E0B', icon: '#F59E0B' };
            case 'info':    return { bg: '#DBEAFE', border: '#3B82F6', icon: '#3B82F6' };
        }
    };

    const variantColors = getVariantColors();

    const IconComponent = {
        success: CheckCircle,
        error: AlertCircle,
        warning: AlertTriangle,
        info: Info,
    }[variant];

    return (
        <Animated.View
            style={[
                styles.toast,
                {
                    backgroundColor: variantColors.bg,
                    borderLeftColor: variantColors.border,
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                    top: insets.top + 8,
                },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <IconComponent size={18} color={variantColors.icon} />
            <Text
                style={[styles.message, { color: colors.textPrimary }]}
                numberOfLines={2}
            >
                {message}
            </Text>
            <TouchableOpacity
                onPress={dismissToast}
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
        </Animated.View>
    );
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    return (
        <View style={styles.container} pointerEvents="box-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} {...toast} onDismiss={onDismiss} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
    },
    toast: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 6,
        maxWidth: 400,
        alignSelf: 'center',
        left: 16,
        right: 16,
    },
    message: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
});
