import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from '../../firebaseConfig';
import {
    optimizeImage,
    sanitizeStoragePath,
    validateImageFormat,
    validateImageSize,
    type PresetName,
} from './imageOptimizer';
import type { BucketItem } from '../types/item';

/**
 * Centralized Storage path helpers.
 * All paths are deterministic so re-uploads overwrite (no orphans).
 *
 * Public dreams use /public_dreams/ path (world-readable).
 * Private dreams use /dreams/{userId}/ path (owner-only).
 * Profile avatars use /avatars/ path (world-readable).
 */
export const StoragePaths = {
    dreamCover: (userId: string, dreamId: string, isPublic: boolean = false) =>
        isPublic
            ? `public_dreams/${dreamId}/cover.jpg`
            : `dreams/${userId}/${dreamId}/cover.jpg`,

    dreamMemory: (userId: string, dreamId: string, memoryId: string, isPublic: boolean = false) =>
        isPublic
            ? `public_dreams/${dreamId}/memories/${memoryId}.jpg`
            : `dreams/${userId}/${dreamId}/memories/${memoryId}.jpg`,

    dreamProgress: (userId: string, dreamId: string, progressId: string, isPublic: boolean = false) =>
        isPublic
            ? `public_dreams/${dreamId}/progress/${progressId}.jpg`
            : `dreams/${userId}/${dreamId}/progress/${progressId}.jpg`,

    profileAvatar: (userId: string) =>
        `avatars/${userId}/avatar.jpg`,

    chatGroupPhoto: (chatId: string) =>
        `chats/${chatId}/group.jpg`,

    chatMessage: (chatId: string, userId: string, messageId: string) =>
        `chats/${chatId}/messages/${userId}/${messageId}.jpg`,
};

export const StorageService = {
    /**
     * Full pipeline: validate format → optimize → validate size → upload.
     *
     * @param uri       Local file URI (file:// or content://)
     * @param path      Firebase Storage destination path
     * @param preset    Optimization preset name
     * @param onProgress Optional progress callback (0–100)
     * @returns         Firebase download URL
     */
    async uploadOptimizedImage(
        uri: string,
        path: string,
        preset: PresetName,
        onProgress?: (percent: number) => void,
    ): Promise<string> {
        // Skip if already an uploaded URL
        if (uri.startsWith('https://')) {
            return uri;
        }

        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        // 1. Validate format
        await validateImageFormat(uri);

        // 2. Sanitize path
        const safePath = sanitizeStoragePath(path);

        // 3. Optimize (resize + compress)
        const optimizedUri = await optimizeImage(uri, preset);

        // 4. Validate size post-optimization
        await validateImageSize(optimizedUri);

        // 5. Upload to Firebase Storage
        const response = await fetch(optimizedUri);
        const blob = await response.blob();

        const storageRef = ref(storage, safePath);
        const uploadTask = uploadBytesResumable(storageRef, blob, {
            contentType: 'image/jpeg',
        });

        return new Promise<string>((resolve, reject) => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    if (onProgress) {
                        const percent = Math.round(
                            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                        );
                        onProgress(percent);
                    }
                },
                (error) => reject(new Error('Upload failed: ' + error.message)),
                async () => {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadUrl);
                },
            );
        });
    },

    /**
     * Legacy wrapper — calls uploadOptimizedImage with coverImage preset.
     * Kept for backwards compatibility with existing callsites during migration.
     */
    async uploadImage(uri: string, path: string): Promise<string> {
        return StorageService.uploadOptimizedImage(uri, path, 'coverImage');
    },

    /**
     * Delete a single file from Firebase Storage.
     * Silently ignores "not found" errors.
     */
    async deleteImage(path: string): Promise<void> {
        try {
            const storageRef = ref(storage, sanitizeStoragePath(path));
            await deleteObject(storageRef);
        } catch (error: any) {
            // Ignore not-found — file may already be deleted
            if (error?.code !== 'storage/object-not-found') {
                throw error;
            }
        }
    },

    /**
     * Delete a file by its download URL.
     * Useful for legacy data where deterministic path and stored ID may not align.
     */
    async deleteImageByUrl(url: string): Promise<void> {
        if (!url || typeof url !== 'string') return;
        try {
            const storageRef = ref(storage, url);
            await deleteObject(storageRef);
        } catch (error: any) {
            if (error?.code !== 'storage/object-not-found') {
                throw error;
            }
        }
    },

    /**
     * Migrate an image from one Storage path to another (e.g. public↔private).
     * Downloads from old path, uploads to new path, deletes old file.
     * Returns the new download URL.
     */
    async migrateImagePath(oldPath: string, newPath: string): Promise<string> {
        const oldRef = ref(storage, sanitizeStoragePath(oldPath));
        const newRef = ref(storage, sanitizeStoragePath(newPath));

        // 1. Download from old path
        const downloadUrl = await getDownloadURL(oldRef);
        const response = await fetch(downloadUrl);
        const blob = await response.blob();

        // 2. Upload to new path
        await uploadBytesResumable(newRef, blob, {
            contentType: blob.type || 'image/jpeg',
        });

        // 3. Get new download URL
        const newDownloadUrl = await getDownloadURL(newRef);

        // 4. Delete old file (best-effort, don't throw)
        try {
            await deleteObject(oldRef);
        } catch (error: any) {
            if (error?.code !== 'storage/object-not-found') {
                console.warn('Failed to delete old image during migration:', error);
            }
        }

        return newDownloadUrl;
    },

    /**
     * Delete all known Storage assets for a dream (cover, memories, progress).
     * Best-effort: failures are logged but not thrown.
     */
    async deleteDreamAssets(userId: string, dreamId: string, item: BucketItem): Promise<void> {
        const paths: string[] = [];
        const isPublic = item.isPublic === true;

        // Cover image
        paths.push(StoragePaths.dreamCover(userId, dreamId, isPublic));

        // Memory images
        if (item.memories) {
            for (const memory of item.memories) {
                paths.push(StoragePaths.dreamMemory(userId, dreamId, memory.id, isPublic));
            }
        }

        // Progress images
        if (item.progress) {
            for (const entry of item.progress) {
                if (entry.imageUrl) {
                    paths.push(StoragePaths.dreamProgress(userId, dreamId, entry.id, isPublic));
                }
            }
        }

        await Promise.allSettled(
            paths.map((p) => StorageService.deleteImage(p))
        );
    },
};
