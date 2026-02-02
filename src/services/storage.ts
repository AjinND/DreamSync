import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../../firebaseConfig';

export const StorageService = {
    async uploadImage(uri: string, path: string): Promise<string> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        // Convert URI to Blob
        const response = await fetch(uri);
        const blob = await response.blob();

        const storageRef = ref(storage, path);

        try {
            await uploadBytes(storageRef, blob);
            return await getDownloadURL(storageRef);
        } catch (e: any) {
            throw new Error("Upload failed: " + e.message);
        }
    }
};
