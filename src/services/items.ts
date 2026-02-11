import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Chat } from '../types/chat';
import { BucketItem, Phase } from '../types/item';
import { decryptDreamFields, decryptField, decryptGroupKey, encryptDreamFields, isEncryptedField } from './encryption';
import { KeyManager } from './keyManager';
import { safeValidate, dreamSchema } from './validation';
import { decodeBase64 } from 'tweetnacl-util';

const COLLECTION_NAME = 'items';

const JOURNEY_COLLAB_TYPES = new Set(['group', 'open']);

const PUBLIC_RESTRICTED_FIELDS: (keyof BucketItem)[] = [
    'location',
    'budget',
    'progress',
    'expenses',
];

const hasPublicRestrictedUpdates = (updates: Partial<BucketItem>): boolean =>
    PUBLIC_RESTRICTED_FIELDS.some((field) => field in updates);

const shouldProtectByPolicy = (targetIsPublic: boolean, updates: Partial<BucketItem>): boolean => {
    if (!targetIsPublic) return true;
    return hasPublicRestrictedUpdates(updates);
};

const resolveJourneyGroupKeyForDream = async (dreamId: string): Promise<Uint8Array | null> => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return null;

    const chatKeyPair = await KeyManager.getChatKeyPair();
    if (!chatKeyPair) return null;

    const journeySnap = await getDocs(
        query(collection(db, 'journeys'), where('dreamId', '==', dreamId), limit(1))
    );
    if (journeySnap.empty) return null;

    const journeyData = journeySnap.docs[0].data() as { chatId?: string };
    if (!journeyData.chatId) return null;

    const chatSnap = await getDoc(doc(db, 'chats', journeyData.chatId));
    if (!chatSnap.exists()) return null;

    const chatData = chatSnap.data() as Chat;
    const encryptedForCurrentUser = chatData.encryptedKeys?.[currentUserId];
    if (!encryptedForCurrentUser) return null;

    const senderPublicKey = decodeBase64(encryptedForCurrentUser.senderPublicKey);
    return decryptGroupKey(encryptedForCurrentUser, chatKeyPair.secretKey, senderPublicKey);
};

const resolveDreamFieldKey = async (
    item: Partial<BucketItem> & { id: string }
): Promise<Uint8Array | null> => {
    const currentUserId = auth.currentUser?.uid;
    const isJourney = JOURNEY_COLLAB_TYPES.has(item.collaborationType || '');

    if (isJourney) {
        const groupKey = await resolveJourneyGroupKeyForDream(item.id);
        if (groupKey) return groupKey;

        // Fallback for owner-only journey before chat/group key exists.
        if (currentUserId && item.userId === currentUserId) {
            return KeyManager.getFieldEncryptionKey();
        }
        return null;
    }

    return KeyManager.getFieldEncryptionKey();
};

const extractProbeEncryptedField = (item: BucketItem): any | null => {
    if (isEncryptedField((item as any).location)) return (item as any).location;
    if (isEncryptedField((item as any).budget)) return (item as any).budget;

    const progress = (item as any).progress;
    if (Array.isArray(progress)) {
        for (const p of progress) {
            if (isEncryptedField(p?.title)) return p.title;
            if (isEncryptedField(p?.description)) return p.description;
            if (isEncryptedField(p?.imageUrl)) return p.imageUrl;
        }
    }

    const expenses = (item as any).expenses;
    if (Array.isArray(expenses)) {
        for (const e of expenses) {
            if (isEncryptedField(e?.title)) return e.title;
            if (isEncryptedField(e?.amount)) return e.amount;
            if (isEncryptedField(e?.category)) return e.category;
        }
    }

    return null;
};

const canDecryptWithKey = (item: BucketItem, key: Uint8Array): boolean => {
    const probe = extractProbeEncryptedField(item);
    if (!probe) return true;
    return decryptField(probe, key) !== null;
};

const stripUndefinedDeep = (value: any): any => {
    if (Array.isArray(value)) {
        return value
            .map((entry) => stripUndefinedDeep(entry))
            .filter((entry) => entry !== undefined);
    }

    if (value && typeof value === 'object') {
        const output: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            if (v === undefined) continue;
            const cleaned = stripUndefinedDeep(v);
            if (cleaned !== undefined) {
                output[k] = cleaned;
            }
        }
        return output;
    }

    return value;
};

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

        // Validate input
        const validation = safeValidate(dreamSchema, {
            title: item.title,
            description: item.description,
            category: item.category,
            phase: item.phase,
            location: item.location,
            budget: item.budget,
            tags: item.tags,
        });
        if (!validation.success) {
            throw new Error(`Validation failed: ${validation.error}`);
        }

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
            // Encrypt sensitive fields for private items
            let itemData: Record<string, any> = {
                ...item,
                userId: user.uid,
                createdAt: Date.now(),
            };

            const fieldKey = await KeyManager.getFieldEncryptionKey();
            if (fieldKey && shouldProtectByPolicy(itemData.isPublic === true, itemData)) {
                itemData = encryptDreamFields(itemData, fieldKey) as Record<string, any>;
            }

            // ... strict sanitization ...
            const sanitizedItem = JSON.parse(JSON.stringify(itemData));

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
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BucketItem));

        return Promise.all(items.map(async (item) => {
            const primaryKey = await resolveDreamFieldKey(item);

            // Decrypt encrypted fields when user has access to the right key.
            if (item.encryptionVersion && primaryKey) {
                if (canDecryptWithKey(item, primaryKey)) {
                    return decryptDreamFields(item, primaryKey);
                }

                // Journey fallback: owner might still have legacy owner-key encrypted data.
                const userId = auth.currentUser?.uid;
                if (userId && item.userId === userId) {
                    const ownerKey = await KeyManager.getFieldEncryptionKey();
                    if (ownerKey && canDecryptWithKey(item, ownerKey)) {
                        const decryptedWithOwnerKey = decryptDreamFields(item, ownerKey);

                        // If a journey shared key is now available, migrate ciphertext to shared key.
                        if (
                            JOURNEY_COLLAB_TYPES.has(item.collaborationType || '') &&
                            primaryKey !== ownerKey
                        ) {
                            const migrated = encryptDreamFields(decryptedWithOwnerKey, primaryKey);
                            const docRef = doc(db, COLLECTION_NAME, item.id);
                            updateDoc(docRef, migrated as Record<string, any>).catch((err) => {
                                console.warn('[ItemService] Journey key migration failed for item:', item.id, err);
                            });
                        }

                        return decryptedWithOwnerKey;
                    }
                }
            }

            // Lazy migration for plaintext docs that should be protected by policy.
            const needsProtection = !item.encryptionVersion && shouldProtectByPolicy(item.isPublic === true, item);
            if (needsProtection && primaryKey) {
                const encrypted = encryptDreamFields(item, primaryKey);
                const docRef = doc(db, COLLECTION_NAME, item.id);
                updateDoc(docRef, encrypted as Record<string, any>).catch((err) => {
                    console.warn('[ItemService] Lazy migration failed for item:', item.id, err);
                });
            }

            return item;
        }));
    },

    // Update
    async updateItem(id: string, updates: Partial<BucketItem>, options?: { skipEncryption?: boolean }) {
        const docRef = doc(db, COLLECTION_NAME, id);

        let processedUpdates: Record<string, any> = { ...updates };

        const currentSnap = await getDoc(docRef);
        const currentData = currentSnap.exists()
            ? ({ id, ...currentSnap.data() } as BucketItem)
            : null;

        const targetIsPublic = processedUpdates.isPublic === undefined
            ? (currentData?.isPublic === true)
            : processedUpdates.isPublic === true;

        // Encrypt sensitive fields based on policy unless caller explicitly handled transition.
        if (!options?.skipEncryption && shouldProtectByPolicy(targetIsPublic, processedUpdates)) {
            const contextForKey = {
                ...(currentData || {}),
                ...processedUpdates,
                id,
                isPublic: targetIsPublic,
            } as Partial<BucketItem> & { id: string };

            const key = await resolveDreamFieldKey(contextForKey);
            if (!key) {
                throw new Error('Unable to resolve encryption key for this dream update');
            }

            processedUpdates = encryptDreamFields(
                { ...processedUpdates, isPublic: targetIsPublic },
                key
            ) as Record<string, any>;
        }

        // Deep sanitize updates to remove undefined values (including nested objects/arrays).
        const sanitizedUpdates = stripUndefinedDeep(processedUpdates) as Record<string, any>;

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

        return Promise.all(results.map(async (item) => {
            if (!item.encryptionVersion) return item;
            const key = await resolveDreamFieldKey(item);
            if (!key || !canDecryptWithKey(item, key)) return item;
            return decryptDreamFields(item, key);
        }));
    },

    // Stats (Optimized usually via aggregation, but simple counting for MVP)
    async getStats() {
        // In MVP, we might calculate this from local list or separate listeners
        // For now, return placeholders
        return { totalDreams: 0, totalDoing: 0, totalDone: 0 };
    },

    /**
     * Subscribe to real-time updates for a single item
     * Returns unsubscribe function for cleanup
     */
    subscribeToItem(itemId: string, callback: (item: BucketItem | null) => void) {
        const docRef = doc(db, COLLECTION_NAME, itemId);

        return onSnapshot(docRef,
            async (docSnap) => {
                if (docSnap.exists()) {
                    let item = { id: docSnap.id, ...docSnap.data() } as BucketItem;

                    // Decrypt if encrypted
                    if (item.encryptionVersion) {
                        const key = await resolveDreamFieldKey(item);
                        if (key && canDecryptWithKey(item, key)) {
                            item = decryptDreamFields(item, key);
                        }
                    }

                    callback(item);
                } else {
                    callback(null);
                }
            },
            (error) => {
                console.error('[ItemService] Error subscribing to item:', error);
                if (error.code === 'permission-denied') {
                    console.error('[ItemService] Permission denied - user may have been removed from journey');
                }
                callback(null);
            }
        );
    }
};
