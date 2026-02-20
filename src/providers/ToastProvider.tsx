/**
 * Toast Provider
 *
 * Provides a global useToast() hook for showing in-app notifications.
 * Wrap the app root with <ToastProvider> to enable toasts everywhere.
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast({ message: 'Dream created!', variant: 'success' });
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { ToastContainer, ToastMessage, ToastVariant } from '../components/ui/Toast';

interface ToastContextType {
    showToast: (options: { message: string; variant?: ToastVariant; duration?: number }) => void;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showInfo: (message: string) => void;
    showWarning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback(({ message, variant = 'info', duration = 3000 }: {
        message: string;
        variant?: ToastVariant;
        duration?: number;
    }) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        setToasts((prev) => [...prev, { id, message, variant, duration }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showSuccess = useCallback((message: string) => showToast({ message, variant: 'success' }), [showToast]);
    const showError = useCallback((message: string) => showToast({ message, variant: 'error' }), [showToast]);
    const showInfo = useCallback((message: string) => showToast({ message, variant: 'info' }), [showToast]);
    const showWarning = useCallback((message: string) => showToast({ message, variant: 'warning' }), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextType {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
