import {
    addDoc,
    collection,
    DocumentData,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    QueryDocumentSnapshot,
    setDoc,
    startAfter,
    updateDoc,
    where
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { Chat } from '../types/chat';
import { BucketItem, Expense, Inspiration, Memory, Phase, ProgressEntry, Reflection } from '../types/item';
import { AppError, ErrorCode, toAppError } from '../utils/AppError';
import { decryptDreamFields, decryptField, decryptGroupKey, encryptDreamFields, encryptField, isEncryptedField } from './encryption';
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

type SubCollectionName = 'memories' | 'progress' | 'expenses' | 'reflections' | 'inspirations';

const getSubCollectionRef = (itemId: string, subCollection: SubCollectionName) =>
    collection(db, COLLECTION_NAME, itemId, subCollection);

const normalizeEncryptedNumber = (value: any, fallback = 0): number => {
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const encryptInspiration = (inspiration: Inspiration, key: Uint8Array, item: BucketItem): Record<string, any> => {
    const shouldEncryptStoryFields = item.isPublic !== true;
    if (!shouldEncryptStoryFields) return inspiration as any;
    return {
        ...inspiration,
        content: typeof inspiration.content === 'string' ? encryptField(inspiration.content, key) : inspiration.content,
        caption: typeof inspiration.caption === 'string' ? encryptField(inspiration.caption, key) : inspiration.caption,
        encryptionVersion: 1,
    };
};

const decryptInspiration = (inspiration: any, key: Uint8Array | null): Inspiration => {
    if (!key) return inspiration as Inspiration;
    return {
        ...inspiration,
        content: isEncryptedField(inspiration.content)
            ? (decryptField(inspiration.content, key) ?? '')
            : inspiration.content,
        caption: isEncryptedField(inspiration.caption)
            ? (decryptField(inspiration.caption, key) ?? '')
            : inspiration.caption,
    } as Inspiration;
};

const encryptMemory = (memory: Memory, key: Uint8Array, item: BucketItem): Record<string, any> => {
    const shouldEncryptStoryFields = item.isPublic !== true;
    if (!shouldEncryptStoryFields) return memory as any;
    return {
        ...memory,
        imageUrl: typeof memory.imageUrl === 'string' ? encryptField(memory.imageUrl, key) : memory.imageUrl,
        caption: typeof memory.caption === 'string' ? encryptField(memory.caption, key) : memory.caption,
        encryptionVersion: 1,
    };
};

const decryptMemory = (memory: any, key: Uint8Array | null): Memory => {
    if (!key) return memory as Memory;
    return {
        ...memory,
        imageUrl: isEncryptedField(memory.imageUrl)
            ? (decryptField(memory.imageUrl, key) ?? '')
            : memory.imageUrl,
        caption: isEncryptedField(memory.caption)
            ? (decryptField(memory.caption, key) ?? '')
            : memory.caption,
    } as Memory;
};

const encryptReflection = (reflection: Reflection, key: Uint8Array, item: BucketItem): Record<string, any> => {
    const shouldEncryptStoryFields = item.isPublic !== true;
    if (!shouldEncryptStoryFields) return reflection as any;
    return {
        ...reflection,
        answer: typeof reflection.answer === 'string' ? encryptField(reflection.answer, key) : reflection.answer,
        contentBlocks: Array.isArray(reflection.contentBlocks)
            ? reflection.contentBlocks.map((block) => ({
                ...block,
                value: typeof block.value === 'string' ? encryptField(block.value, key) : block.value,
                caption: typeof block.caption === 'string' ? encryptField(block.caption, key) : block.caption,
            }))
            : reflection.contentBlocks,
        encryptionVersion: 1,
    };
};

const decryptReflection = (reflection: any, key: Uint8Array | null): Reflection => {
    if (!key) return reflection as Reflection;
    return {
        ...reflection,
        answer: isEncryptedField(reflection.answer)
            ? (decryptField(reflection.answer, key) ?? '')
            : reflection.answer,
        contentBlocks: Array.isArray(reflection.contentBlocks)
            ? reflection.contentBlocks.map((block: any) => ({
                ...block,
                value: isEncryptedField(block.value) ? (decryptField(block.value, key) ?? '') : block.value,
                caption: isEncryptedField(block.caption) ? (decryptField(block.caption, key) ?? '') : block.caption,
            }))
            : reflection.contentBlocks,
    } as Reflection;
};

const encryptProgress = (entry: ProgressEntry, key: Uint8Array): Record<string, any> => ({
    ...entry,
    title: typeof entry.title === 'string' ? encryptField(entry.title, key) : entry.title,
    description: typeof entry.description === 'string' ? encryptField(entry.description, key) : entry.description,
    imageUrl: typeof entry.imageUrl === 'string' ? encryptField(entry.imageUrl, key) : entry.imageUrl,
    encryptionVersion: 1,
});

const decryptProgress = (entry: any, key: Uint8Array | null): ProgressEntry => {
    if (!key) return entry as ProgressEntry;
    return {
        ...entry,
        title: isEncryptedField(entry.title) ? (decryptField(entry.title, key) ?? '') : entry.title,
        description: isEncryptedField(entry.description) ? (decryptField(entry.description, key) ?? '') : entry.description,
        imageUrl: isEncryptedField(entry.imageUrl) ? (decryptField(entry.imageUrl, key) ?? '') : entry.imageUrl,
    } as ProgressEntry;
};

const encryptExpense = (expense: Expense, key: Uint8Array): Record<string, any> => ({
    ...expense,
    title: typeof expense.title === 'string' ? encryptField(expense.title, key) : expense.title,
    amount: typeof expense.amount === 'number' ? encryptField(String(expense.amount), key) : expense.amount,
    category: typeof expense.category === 'string' ? encryptField(expense.category, key) : expense.category,
    encryptionVersion: 1,
});

const decryptExpense = (expense: any, key: Uint8Array | null): Expense => {
    if (!key) return expense as Expense;
    const amountValue = isEncryptedField(expense.amount)
        ? (decryptField(expense.amount, key) ?? '0')
        : expense.amount;
    const categoryValue = isEncryptedField(expense.category)
        ? (decryptField(expense.category, key) ?? 'other')
        : expense.category;
    return {
        ...expense,
        title: isEncryptedField(expense.title) ? (decryptField(expense.title, key) ?? '') : expense.title,
        amount: normalizeEncryptedNumber(amountValue, 0),
        category: categoryValue,
    } as Expense;
};

export const ItemService = {
    // Create
    async createItem(item: Omit<BucketItem, 'id' | 'createdAt' | 'userId'>) {
        const user = auth.currentUser;
        if (!user) {
            console.error("[ItemService] User not authenticated!");
            throw new AppError('User not authenticated', ErrorCode.AUTH_REQUIRED, 'Please sign in to create dreams.');
        }

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
            throw new AppError(
                `Validation failed: ${validation.error}`,
                ErrorCode.VALIDATION_ERROR,
                'Dream details are invalid. Please review and try again.',
            );
        }

        try {
            // Encrypt sensitive fields for private items
            let itemData: Record<string, any> = {
                ...item,
                userId: user.uid,
                createdAt: Date.now(),
            };
            delete itemData.inspirations;
            delete itemData.memories;
            delete itemData.reflections;
            delete itemData.progress;
            delete itemData.expenses;

            const fieldKey = await KeyManager.getFieldEncryptionKey();
            if (fieldKey && shouldProtectByPolicy(itemData.isPublic === true, itemData)) {
                itemData = encryptDreamFields(itemData, fieldKey) as Record<string, any>;
            }

            // ... strict sanitization ...
            const sanitizedItem = JSON.parse(JSON.stringify(itemData));


            // Create a timeout promise
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Firestore operation timed out. Check your internet or if Database is enabled.")), 10000)
            );

            // Race addDoc against timeout
            const docRef = await Promise.race([
                addDoc(collection(db, COLLECTION_NAME), sanitizedItem),
                timeout
            ]) as any;

            return { id: docRef.id, ...item };
        } catch (error) {
            console.error("[ItemService] Error adding document:", error);
            throw toAppError(error, {
                code: ErrorCode.UNKNOWN,
                userMessage: 'Failed to create dream. Please try again.',
            });
        }
    },

    // Read User Items
    async getUserItems(phase?: Phase): Promise<BucketItem[]> {
        const result = await ItemService.getUserItemsPaginated({ phase, pageSize: 100, cursor: null });
        return result.items;
    },

    async getUserItemsPaginated(options?: {
        phase?: Phase;
        pageSize?: number;
        cursor?: QueryDocumentSnapshot<DocumentData> | null;
    }): Promise<{
        items: BucketItem[];
        lastDoc: QueryDocumentSnapshot<DocumentData> | null;
        hasMore: boolean;
    }> {
        const phase = options?.phase;
        const pageSize = options?.pageSize ?? 20;
        const cursor = options?.cursor ?? null;
        const user = auth.currentUser;
        if (!user) {
            throw new AppError('User not authenticated', ErrorCode.AUTH_REQUIRED, 'Please sign in to load your dreams.');
        }

        let q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        if (phase) {
            q = query(q, where("phase", "==", phase));
        }

        q = cursor ? query(q, startAfter(cursor), limit(pageSize)) : query(q, limit(pageSize));

        const snapshot = await getDocs(q);
        const lastDoc = snapshot.empty ? cursor : snapshot.docs[snapshot.docs.length - 1];
        const hasMore = snapshot.size >= pageSize;
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BucketItem));

        // Batch-resolve journey group keys for all journey-linked items (N+1 fix)
        const journeyItems = items.filter(item => JOURNEY_COLLAB_TYPES.has(item.collaborationType || ''));
        const groupKeyCache = new Map<string, Uint8Array>();

        if (journeyItems.length > 0) {
            const chatKeyPair = await KeyManager.getChatKeyPair();
            const currentUserId = auth.currentUser?.uid;

            if (chatKeyPair && currentUserId) {
                // Batch-fetch all journey docs
                const dreamIds = journeyItems.map(item => item.id);
                const journeyChunks: string[][] = [];
                for (let i = 0; i < dreamIds.length; i += 10) {
                    journeyChunks.push(dreamIds.slice(i, i + 10));
                }

                const journeySnapshots = await Promise.all(
                    journeyChunks.map(chunk =>
                        getDocs(query(collection(db, 'journeys'), where('dreamId', 'in', chunk)))
                    )
                );

                const journeyDocs = journeySnapshots.flatMap(snap => snap.docs);
                const chatIds = journeyDocs
                    .map(doc => (doc.data() as any).chatId)
                    .filter(Boolean);

                // Batch-fetch all chat docs
                const chatChunks: string[][] = [];
                for (let i = 0; i < chatIds.length; i += 10) {
                    chatChunks.push(chatIds.slice(i, i + 10));
                }

                const chatSnapshots = await Promise.all(
                    chatChunks.map(chunk =>
                        getDocs(query(collection(db, 'chats'), where('__name__', 'in', chunk)))
                    )
                );

                // Build dreamId -> chatDoc map
                const dreamIdToChatDoc = new Map<string, any>();
                journeyDocs.forEach(journeyDoc => {
                    const journeyData = journeyDoc.data();
                    const dreamId = journeyData.dreamId;
                    const chatId = journeyData.chatId;
                    if (chatId) {
                        const chatDoc = chatSnapshots
                            .flatMap(snap => snap.docs)
                            .find(doc => doc.id === chatId);
                        if (chatDoc) {
                            dreamIdToChatDoc.set(dreamId, chatDoc.data());
                        }
                    }
                });

                // Decrypt group keys for all journey items
                journeyItems.forEach(item => {
                    const chatData = dreamIdToChatDoc.get(item.id);
                    if (chatData) {
                        const encryptedForCurrentUser = chatData.encryptedKeys?.[currentUserId];
                        if (encryptedForCurrentUser) {
                            const senderPublicKey = decodeBase64(encryptedForCurrentUser.senderPublicKey);
                            const groupKey = decryptGroupKey(
                                encryptedForCurrentUser,
                                chatKeyPair.secretKey,
                                senderPublicKey
                            );
                            if (groupKey) {
                                groupKeyCache.set(item.id, groupKey);
                            }
                        }
                    }
                });
            }
        }

        const decryptedItems = await Promise.all(items.map(async (item) => {
            // Use cached group key for journey items
            let primaryKey: Uint8Array | null = null;
            if (JOURNEY_COLLAB_TYPES.has(item.collaborationType || '')) {
                primaryKey = groupKeyCache.get(item.id) || null;
                // Fallback for owner-only journey before chat/group key exists
                if (!primaryKey) {
                    const currentUserId = auth.currentUser?.uid;
                    if (currentUserId && item.userId === currentUserId) {
                        primaryKey = await KeyManager.getFieldEncryptionKey();
                    }
                }
            } else {
                primaryKey = await KeyManager.getFieldEncryptionKey();
            }

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

        return {
            items: decryptedItems,
            lastDoc,
            hasMore,
        };
    },

    // Update
    async updateItem(id: string, updates: Partial<BucketItem>, options?: { skipEncryption?: boolean; currentIsPublic?: boolean }) {
        const docRef = doc(db, COLLECTION_NAME, id);

        let processedUpdates: Record<string, any> = { ...updates };
        delete processedUpdates.inspirations;
        delete processedUpdates.memories;
        delete processedUpdates.reflections;
        delete processedUpdates.progress;
        delete processedUpdates.expenses;

        // Use provided currentIsPublic if available, otherwise fetch document
        let currentData: BucketItem | null = null;
        if (options?.currentIsPublic === undefined) {
            const currentSnap = await getDoc(docRef);
            currentData = currentSnap.exists()
                ? ({ id, ...currentSnap.data() } as BucketItem)
                : null;
        }

        const targetIsPublic = processedUpdates.isPublic === undefined
            ? (options?.currentIsPublic ?? currentData?.isPublic === true)
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
                throw new AppError(
                    'Unable to resolve encryption key for this dream update',
                    ErrorCode.ENCRYPTION_ERROR,
                    'Could not secure this dream update. Please retry.',
                );
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

    async getItemById(id: string): Promise<BucketItem | null> {
        const snap = await getDoc(doc(db, COLLECTION_NAME, id));
        if (!snap.exists()) return null;

        let item = { id: snap.id, ...snap.data() } as BucketItem;
        if (item.encryptionVersion) {
            const key = await resolveDreamFieldKey(item);
            if (key && canDecryptWithKey(item, key)) {
                item = decryptDreamFields(item, key);
            }
        }
        return item;
    },

    async addInspiration(itemId: string, inspiration: Inspiration): Promise<Inspiration> {
        const item = await ItemService.getItemById(itemId);
        if (!item) throw new AppError('Dream not found', ErrorCode.NOT_FOUND, 'Dream was not found.');

        const key = await resolveDreamFieldKey(item);
        const payload = key ? encryptInspiration(inspiration, key, item) : inspiration;
        await setDoc(doc(db, COLLECTION_NAME, itemId, 'inspirations', inspiration.id), payload);
        return inspiration;
    },

    async getInspirations(itemId: string): Promise<Inspiration[]> {
        const item = await ItemService.getItemById(itemId);
        if (!item) return [];
        // Inspiration has no `date` field, so orderBy('date') silently returns 0 docs.
        // Use a plain fetch; document IDs are ${Date.now()}-${random} so order is implicit.
        const key = await resolveDreamFieldKey(item);
        const snap = await getDocs(getSubCollectionRef(itemId, 'inspirations'));
        return snap.docs.map((d) => decryptInspiration({ id: d.id, ...d.data() }, key));
    },

    async deleteInspiration(itemId: string, inspirationId: string): Promise<void> {
        await deleteDoc(doc(db, COLLECTION_NAME, itemId, 'inspirations', inspirationId));
    },

    async addMemory(itemId: string, memory: Memory): Promise<Memory> {
        const item = await ItemService.getItemById(itemId);
        if (!item) throw new AppError('Dream not found', ErrorCode.NOT_FOUND, 'Dream was not found.');

        const key = await resolveDreamFieldKey(item);
        const payload = key ? encryptMemory(memory, key, item) : memory;
        await setDoc(doc(db, COLLECTION_NAME, itemId, 'memories', memory.id), payload);
        return memory;
    },

    async getMemories(itemId: string): Promise<Memory[]> {
        const item = await ItemService.getItemById(itemId);
        if (!item) return [];
        const key = await resolveDreamFieldKey(item);

        const snap = await getDocs(query(getSubCollectionRef(itemId, 'memories'), orderBy('date', 'desc')))
            .catch(async () => getDocs(getSubCollectionRef(itemId, 'memories')));
        return snap.docs.map((d) => decryptMemory({ id: d.id, ...d.data() }, key));
    },

    async deleteMemory(itemId: string, memoryId: string): Promise<void> {
        await deleteDoc(doc(db, COLLECTION_NAME, itemId, 'memories', memoryId));
    },

    async addReflection(itemId: string, reflection: Reflection): Promise<Reflection> {
        const item = await ItemService.getItemById(itemId);
        if (!item) throw new AppError('Dream not found', ErrorCode.NOT_FOUND, 'Dream was not found.');

        const key = await resolveDreamFieldKey(item);
        const payload = key ? encryptReflection(reflection, key, item) : reflection;
        await setDoc(doc(db, COLLECTION_NAME, itemId, 'reflections', reflection.id), payload);
        return reflection;
    },

    async getReflections(itemId: string): Promise<Reflection[]> {
        const item = await ItemService.getItemById(itemId);
        if (!item) return [];
        const key = await resolveDreamFieldKey(item);

        const snap = await getDocs(query(getSubCollectionRef(itemId, 'reflections'), orderBy('date', 'desc')))
            .catch(async () => getDocs(getSubCollectionRef(itemId, 'reflections')));
        return snap.docs.map((d) => decryptReflection({ id: d.id, ...d.data() }, key));
    },

    async deleteReflection(itemId: string, reflectionId: string): Promise<void> {
        await deleteDoc(doc(db, COLLECTION_NAME, itemId, 'reflections', reflectionId));
    },

    async addProgress(itemId: string, entry: ProgressEntry): Promise<ProgressEntry> {
        const item = await ItemService.getItemById(itemId);
        if (!item) throw new AppError('Dream not found', ErrorCode.NOT_FOUND, 'Dream was not found.');

        const key = await resolveDreamFieldKey(item);
        if (!key) {
            throw new AppError('No encryption key available', ErrorCode.ENCRYPTION_ERROR, 'Could not secure this progress update.');
        }

        await setDoc(doc(db, COLLECTION_NAME, itemId, 'progress', entry.id), encryptProgress(entry, key));
        return entry;
    },

    async getProgress(itemId: string): Promise<ProgressEntry[]> {
        const item = await ItemService.getItemById(itemId);
        if (!item) return [];
        const key = await resolveDreamFieldKey(item);

        const snap = await getDocs(query(getSubCollectionRef(itemId, 'progress'), orderBy('date', 'desc')))
            .catch(async () => getDocs(getSubCollectionRef(itemId, 'progress')));
        return snap.docs.map((d) => decryptProgress({ id: d.id, ...d.data() }, key));
    },

    async deleteProgress(itemId: string, progressId: string): Promise<void> {
        await deleteDoc(doc(db, COLLECTION_NAME, itemId, 'progress', progressId));
    },

    async addExpense(itemId: string, expense: Expense): Promise<Expense> {
        const item = await ItemService.getItemById(itemId);
        if (!item) throw new AppError('Dream not found', ErrorCode.NOT_FOUND, 'Dream was not found.');

        const key = await resolveDreamFieldKey(item);
        if (!key) {
            throw new AppError('No encryption key available', ErrorCode.ENCRYPTION_ERROR, 'Could not secure this expense.');
        }

        await setDoc(doc(db, COLLECTION_NAME, itemId, 'expenses', expense.id), encryptExpense(expense, key));
        return expense;
    },

    async getExpenses(itemId: string): Promise<Expense[]> {
        const item = await ItemService.getItemById(itemId);
        if (!item) return [];
        const key = await resolveDreamFieldKey(item);

        const snap = await getDocs(query(getSubCollectionRef(itemId, 'expenses'), orderBy('date', 'desc')))
            .catch(async () => getDocs(getSubCollectionRef(itemId, 'expenses')));
        return snap.docs.map((d) => decryptExpense({ id: d.id, ...d.data() }, key));
    },

    async deleteExpense(itemId: string, expenseId: string): Promise<void> {
        await deleteDoc(doc(db, COLLECTION_NAME, itemId, 'expenses', expenseId));
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

        // Parallelize chunk queries for faster batch fetch
        const snapshots = await Promise.all(
            chunks.map(chunk =>
                getDocs(query(
                    collection(db, COLLECTION_NAME),
                    where('__name__', 'in', chunk) // __name__ refers to document ID
                ))
            )
        );

        const results: BucketItem[] = snapshots.flatMap(snapshot =>
            snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BucketItem))
        );

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
