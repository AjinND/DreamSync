import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { BucketItem, Phase } from '../types/item';

const COLLECTION_NAME = 'items';

export const ItemService = {
    // Create
    async createItem(item: Omit<BucketItem, 'id' | 'createdAt' | 'userId'>) {
        console.log("[ItemService] createItem called with:", item);
        const user = auth.currentUser;
        if (!user) {
            console.error("[ItemService] User not authenticated!");
            throw new Error("User not authenticated");
        }
        console.log("[ItemService] Current User ID:", user.uid);

        // Test Connectivity / DB Existence
        try {
            console.log("[ItemService] Testing DB connectivity...");
            const testTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("DB_TIMEOUT")), 15000));
            // Try to read a dummy doc to see if it responds (Project either exists or doesn't)
            // Query for OUR OWN items so it passes security rules
            await Promise.race([getDocs(query(collection(db, 'items'), where('userId', '==', user.uid), limit(1))), testTimeout]);
            console.log("[ItemService] DB Connection Confirmed (Read success)");
        } catch (e: any) {
            if (e.message === 'DB_TIMEOUT') {
                console.error("[ItemService] DB Connection Timed Out. Likely 'Firestore Datebase' is NOT created in Console.");
                throw new Error("Could not connect to Database. Did you create 'Firestore Database' in Firebase Console?");
            }
            console.log("[ItemService] DB Responded (even if error, it exists):", e.message);
        }

        try {
            // ... strict sanitization ...
            const sanitizedItem = JSON.parse(JSON.stringify({
                ...item,
                userId: user.uid,
                createdAt: Date.now(),
            }));

            console.log("[ItemService] Sanitized Item for Firestore:", sanitizedItem);
            console.log("[ItemService] Attempting to write to 'items' collection...");

            // Create a timeout promise
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Firestore operation timed out. Check your internet or if Database is enabled.")), 10000)
            );

            // Race addDoc against timeout
            const docRef = await Promise.race([
                addDoc(collection(db, COLLECTION_NAME), sanitizedItem),
                timeout
            ]) as any;

            console.log("[ItemService] Item created successfully with ID:", docRef.id);
            return { id: docRef.id, ...item };
        } catch (error) {
            console.error("[ItemService] Error adding document:", error);
            throw error;
        }
    },

    // Read User Items
    async getUserItems(phase?: Phase): Promise<BucketItem[]> {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        let q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", user.uid)
            // orderBy("createdAt", "desc") // Commented out to avoid Index requirement for now
        );

        if (phase) {
            q = query(q, where("phase", "==", phase));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BucketItem));
    },

    // Update
    async updateItem(id: string, updates: Partial<BucketItem>) {
        const docRef = doc(db, COLLECTION_NAME, id);
        // Sanitize updates to remove undefined values, as Firestore rejects them
        const sanitizedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key as keyof BucketItem] = value as any;
            }
            return acc;
        }, {} as Partial<BucketItem>);

        await updateDoc(docRef, sanitizedUpdates);
    },

    // Delete
    async deleteItem(id: string) {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    },

    // Batch Get
    async getItemsByIds(ids: string[]): Promise<BucketItem[]> {
        if (!ids || ids.length === 0) return [];

        const chunks = [];
        // Firestore 'in' query limit is 10
        for (let i = 0; i < ids.length; i += 10) {
            chunks.push(ids.slice(i, i + 10));
        }

        const results: BucketItem[] = [];
        for (const chunk of chunks) {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('__name__', 'in', chunk) // __name__ refers to document ID
            );
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() } as BucketItem));
        }

        return results;
    },

    // Stats (Optimized usually via aggregation, but simple counting for MVP)
    async getStats() {
        // In MVP, we might calculate this from local list or separate listeners
        // For now, return placeholders
        return { totalDreams: 0, totalDoing: 0, totalDone: 0 };
    }
};
