import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { AppError, ErrorCode } from '../utils/AppError';

export interface ImagePreset {
    maxWidth: number;
    maxHeight: number;
    compress: number;
}

export const IMAGE_PRESETS = {
    coverImage: { maxWidth: 1200, maxHeight: 675, compress: 0.8 },
    avatar: { maxWidth: 400, maxHeight: 400, compress: 0.7 },
    memoryImage: { maxWidth: 1000, maxHeight: 750, compress: 0.75 },
    progressImage: { maxWidth: 1000, maxHeight: 563, compress: 0.7 },
    chatMessage: { maxWidth: 1280, maxHeight: 1280, compress: 0.78 },
} as const satisfies Record<string, ImagePreset>;

export type PresetName = keyof typeof IMAGE_PRESETS;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
]);

const ALLOWED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif',
]);

/**
 * Validate image format and size in a single fetch/blob pass.
 */
export async function validateImage(
    uri: string,
    maxBytes: number = MAX_IMAGE_BYTES,
): Promise<void> {
    const extensionMatch = uri.match(/\.(\w+)(?:\?.*)?$/);
    if (extensionMatch) {
        const ext = `.${extensionMatch[1].toLowerCase()}`;
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            throw new AppError(
                `Unsupported image format: ${ext}.`,
                ErrorCode.VALIDATION_ERROR,
                'Unsupported image format. Use JPEG, PNG, WebP, or HEIC.',
            );
        }
    }

    const response = await fetch(uri);
    const blob = await response.blob();

    // Validate MIME when available. If not available, extension must exist and be valid.
    if (blob.type) {
        if (!ALLOWED_MIME_TYPES.has(blob.type)) {
            throw new AppError(
                `Invalid image type: ${blob.type}.`,
                ErrorCode.VALIDATION_ERROR,
                'Invalid image type. Use JPEG, PNG, WebP, or HEIC.',
            );
        }
    } else if (!extensionMatch) {
        throw new AppError(
            'Unable to verify image format.',
            ErrorCode.VALIDATION_ERROR,
            'Unable to verify image format. Please choose another image.',
        );
    }

    if (blob.size > maxBytes) {
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
        const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);
        throw new AppError(
            `Image too large: ${sizeMB}MB > ${maxMB}MB.`,
            ErrorCode.VALIDATION_ERROR,
            `Image is too large (${sizeMB}MB). Maximum allowed size is ${maxMB}MB.`,
        );
    }
}

/**
 * Backward-compatible wrappers.
 */
export async function validateImageFormat(uri: string): Promise<void> {
    await validateImage(uri);
}

export async function validateImageSize(uri: string, maxBytes: number = MAX_IMAGE_BYTES): Promise<void> {
    await validateImage(uri, maxBytes);
}

/**
 * Sanitize a Firebase Storage path to prevent path traversal and injection.
 */
export function sanitizeStoragePath(path: string): string {
    let sanitized = path.replace(/\0/g, '');

    let previous = '';
    while (previous !== sanitized) {
        previous = sanitized;
        sanitized = sanitized.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
    }

    sanitized = sanitized.replace(/[^a-zA-Z0-9/_\-\.]/g, '');
    sanitized = sanitized.replace(/^\/+/, '');
    return sanitized;
}

/**
 * Optimize an image by resizing and compressing it according to a preset.
 */
export async function optimizeImage(uri: string, presetName: PresetName): Promise<string> {
    const preset = IMAGE_PRESETS[presetName];

    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: preset.maxWidth });

    const renderedImage = await context.renderAsync();
    const result = await renderedImage.saveAsync({
        compress: preset.compress,
        format: SaveFormat.JPEG,
    });

    return result.uri;
}

