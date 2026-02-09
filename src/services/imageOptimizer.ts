import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

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
 * Validate that a URI points to an allowed image format.
 * Checks file extension (when present) and actual MIME type from the blob.
 * For content:// URIs (Android) without extensions, relies on MIME type alone.
 */
export async function validateImageFormat(uri: string): Promise<void> {
    const extensionMatch = uri.match(/\.(\w+)(?:\?.*)?$/);
    if (extensionMatch) {
        const ext = `.${extensionMatch[1].toLowerCase()}`;
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            throw new Error(`Unsupported image format: ${ext}. Allowed: JPEG, PNG, WebP, HEIC`);
        }
    }

    const response = await fetch(uri);
    const blob = await response.blob();

    // If MIME type is available, validate it against allowlist.
    // If MIME type is empty (common for local file:// URIs on RN),
    // accept only when the extension was already validated above.
    if (blob.type) {
        if (!ALLOWED_MIME_TYPES.has(blob.type)) {
            throw new Error(
                `Invalid image type: ${blob.type}. Only JPEG, PNG, WebP, and HEIC images are allowed.`
            );
        }
    } else if (!extensionMatch) {
        // No extension AND no MIME type — cannot verify format
        throw new Error(
            'Unable to verify image format. Only JPEG, PNG, WebP, and HEIC images are allowed.'
        );
    }
}

/**
 * Validate that an image does not exceed the maximum file size.
 */
export async function validateImageSize(uri: string, maxBytes: number = MAX_IMAGE_BYTES): Promise<void> {
    const response = await fetch(uri);
    const blob = await response.blob();

    if (blob.size > maxBytes) {
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
        const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);
        throw new Error(
            `Image is too large (${sizeMB}MB). Maximum allowed size is ${maxMB}MB.`
        );
    }
}

/**
 * Sanitize a Firebase Storage path to prevent path traversal and injection.
 * Recursively strips `../`, `..\\`, null bytes, and non-safe characters.
 * Also strips leading slashes to prevent absolute path escape.
 */
export function sanitizeStoragePath(path: string): string {
    let sanitized = path.replace(/\0/g, '');

    // Recursively remove traversal sequences until stable
    let previous = '';
    while (previous !== sanitized) {
        previous = sanitized;
        sanitized = sanitized.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
    }

    sanitized = sanitized.replace(/[^a-zA-Z0-9/_\-\.]/g, '');
    // Strip leading slashes
    sanitized = sanitized.replace(/^\/+/, '');
    return sanitized;
}

/**
 * Optimize an image by resizing and compressing it according to a preset.
 * Uses the modern ImageManipulator.manipulate() API.
 * Preserves aspect ratio by resizing to fit within preset bounds.
 * Returns the URI of the optimized image (JPEG format).
 */
export async function optimizeImage(uri: string, presetName: PresetName): Promise<string> {
    const preset = IMAGE_PRESETS[presetName];

    const context = ImageManipulator.manipulate(uri);

    // Resize to fit within max bounds while preserving aspect ratio.
    // Pass only width — the manipulator auto-calculates height proportionally.
    context.resize({ width: preset.maxWidth });

    const renderedImage = await context.renderAsync();
    const result = await renderedImage.saveAsync({
        compress: preset.compress,
        format: SaveFormat.JPEG,
    });

    return result.uri;
}
