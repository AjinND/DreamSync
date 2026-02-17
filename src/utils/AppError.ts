export enum ErrorCode {
    AUTH_REQUIRED = 'AUTH_REQUIRED',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    NOT_FOUND = 'NOT_FOUND',
    NETWORK_ERROR = 'NETWORK_ERROR',
    ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    STORAGE_ERROR = 'STORAGE_ERROR',
    RATE_LIMITED = 'RATE_LIMITED',
    UNKNOWN = 'UNKNOWN',
}

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly userMessage: string;
    public readonly originalError?: unknown;

    constructor(
        message: string,
        code: ErrorCode,
        userMessage: string,
        originalError?: unknown,
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.userMessage = userMessage;
        this.originalError = originalError;
    }
}

export const isAppError = (error: unknown): error is AppError =>
    error instanceof AppError;

export const getUserMessage = (
    error: unknown,
    fallback: string = 'Something went wrong. Please try again.',
): string => {
    if (isAppError(error)) return error.userMessage;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

export const toAppError = (
    error: unknown,
    defaults?: {
        code?: ErrorCode;
        userMessage?: string;
        message?: string;
    }
): AppError => {
    if (isAppError(error)) return error;

    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    const normalized = message.toLowerCase();

    if (normalized.includes('permission') || normalized.includes('permission-denied')) {
        return new AppError(
            defaults?.message || message,
            ErrorCode.PERMISSION_DENIED,
            defaults?.userMessage || 'You do not have permission to perform this action.',
            error,
        );
    }

    if (normalized.includes('not authenticated') || normalized.includes('auth')) {
        return new AppError(
            defaults?.message || message,
            ErrorCode.AUTH_REQUIRED,
            defaults?.userMessage || 'Please sign in to continue.',
            error,
        );
    }

    if (normalized.includes('network') || normalized.includes('timeout')) {
        return new AppError(
            defaults?.message || message,
            ErrorCode.NETWORK_ERROR,
            defaults?.userMessage || 'Network issue. Please check your connection and retry.',
            error,
        );
    }

    if (normalized.includes('validation failed')) {
        return new AppError(
            defaults?.message || message,
            ErrorCode.VALIDATION_ERROR,
            defaults?.userMessage || 'Some fields are invalid. Please review and try again.',
            error,
        );
    }

    return new AppError(
        defaults?.message || message,
        defaults?.code || ErrorCode.UNKNOWN,
        defaults?.userMessage || 'Something went wrong. Please try again.',
        error,
    );
};

