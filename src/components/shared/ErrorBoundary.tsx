import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getUserMessage, isAppError } from '@/src/utils/AppError';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: unknown;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: unknown) {
        console.error('[ErrorBoundary] Caught render error:', error);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const currentError = this.state.error;
        const hasAppError = isAppError(currentError);
        const message = getUserMessage(currentError);

        return (
            <View style={styles.container}>
                <Text style={styles.title}>Something went wrong</Text>
                <Text style={styles.message}>{message}</Text>
                <Text style={styles.code}>
                    {hasAppError ? `Code: ${currentError.code}` : 'Code: UNKNOWN'}
                </Text>
                <Pressable onPress={this.handleRetry} style={styles.button}>
                    <Text style={styles.buttonText}>Try Again</Text>
                </Pressable>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 10,
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        color: '#334155',
        marginBottom: 6,
    },
    code: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#1d4ed8',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
});
