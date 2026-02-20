/**
 * Key Manager for DreamSync
 *
 * Manages the lifecycle of encryption keys:
 * - Secure local storage (expo-secure-store on native, sessionStorage on web)
 * - Key derivation from password on signup/login
 * - Public key publication to Firestore
 * - In-memory caching for derived sub-keys
 */

import * as SecureStore from 'expo-secure-store';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import nacl from 'tweetnacl';
import { db } from '../../firebaseConfig';
import { KeyDerivationMeta, UserKeyData } from '../types/encryption';
import { AppError, ErrorCode } from '../utils/AppError';
import {
    deriveChatKeyPair,
    deriveFieldEncryptionKey,
    deriveKeyFromPassword,
    generateSalt,
} from './encryption';

const SECURE_KEY_MASTER = 'dreamsync_master_key';
const SECURE_KEY_SALT = 'dreamsync_key_salt';
const KDF_ITERATIONS = 10_000; // Reduced from 100k; Web Crypto path makes this fast anyway
const KEY_VERSION = 1;
const PRIVATE_COLLECTION = 'private';
const PRIVATE_KEYS_DOC = 'keys';

// ---------------------------------------------------------------------------
// In-memory cache (cleared on sign-out)
// ---------------------------------------------------------------------------

let cachedMasterKey: Uint8Array | null = null;
let cachedChatKeyPair: nacl.BoxKeyPair | null = null;
let cachedFieldKey: Uint8Array | null = null;
const publicKeyCache: Map<string, Uint8Array> = new Map();

// ---------------------------------------------------------------------------
// Secure Storage Abstraction
// ---------------------------------------------------------------------------

async function secureSet(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
        try {
            // SECURITY NOTE: sessionStorage on web is accessible to JavaScript running on
            // the same origin. An XSS vulnerability could allow an attacker to read the
            // master key and decrypt all user data. Ensure strict CSP headers are configured
            // on the web host to mitigate this risk. A future improvement is to use the
            // Web Crypto API's non-extractable CryptoKey objects which cannot be read by JS.
            if (__DEV__) {
                console.warn('[KeyManager] Web storage uses sessionStorage. Ensure CSP headers are configured to mitigate XSS risk.');
            }
            sessionStorage.setItem(key, value);
        } catch {
            // sessionStorage may be unavailable in some contexts
        }
    } else {
        await SecureStore.setItemAsync(key, value);
    }
}

async function secureGet(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        try {
            return sessionStorage.getItem(key);
        } catch {
            return null;
        }
    }
    return SecureStore.getItemAsync(key);
}

async function secureDelete(key: string): Promise<void> {
    if (Platform.OS === 'web') {
        try {
            sessionStorage.removeItem(key);
        } catch {
            // ignore
        }
    } else {
        await SecureStore.deleteItemAsync(key);
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const KeyManager = {
    _getPublicUserRef(userId: string) {
        return doc(db, 'users', userId);
    },

    _getPrivateKeysRef(userId: string) {
        return doc(db, 'users', userId, PRIVATE_COLLECTION, PRIVATE_KEYS_DOC);
    },

    /**
     * Generate keys on first signup.
     * 1. Generate salt
     * 2. Derive master key from password
     * 3. Derive chat keypair & field key
     * 4. Store master key in secure storage
     * 5. Publish public key + derivation meta to Firestore
     */
    async initializeKeysOnSignup(password: string, userId: string): Promise<void> {
        const salt = generateSalt();
        const masterKey = await deriveKeyFromPassword(password, salt, KDF_ITERATIONS);

        // Derive sub-keys
        const chatKeyPair = deriveChatKeyPair(masterKey);
        const fieldKey = deriveFieldEncryptionKey(masterKey);

        // Store master key and salt locally (salt is backup in case Firestore write fails)
        await secureSet(SECURE_KEY_MASTER, encodeBase64(masterKey));
        await secureSet(SECURE_KEY_SALT, salt);

        // Cache in memory
        cachedMasterKey = masterKey;
        cachedChatKeyPair = chatKeyPair;
        cachedFieldKey = fieldKey;

        // Publish to Firestore — retry once on failure
        const publicKeyData = {
            publicKey: encodeBase64(chatKeyPair.publicKey),
            keyVersion: KEY_VERSION,
        };

        const privateKeyData = {
            keySalt: salt,
            keyIterations: KDF_ITERATIONS,
            keyDerivationVersion: KEY_VERSION,
        };

        const userRef = KeyManager._getPublicUserRef(userId);
        const privateKeysRef = KeyManager._getPrivateKeysRef(userId);
        try {
            await updateDoc(userRef, publicKeyData);
            await setDoc(privateKeysRef, privateKeyData, { merge: true });
        } catch {
            // User doc may not exist yet (race with ensureUserProfile).
            // Store salt locally; publishKeyData will be called by ensureUserProfile.
            __DEV__ && console.warn('[KeyManager] Initial key publish failed, will retry via ensureUserProfile');
        }
    },

    /**
     * Re-derive keys on login (or reauth).
     * 1. Fetch salt from Firestore
     * 2. Re-derive master key from password
     * 3. Verify public key matches
     * 4. Store & cache
     */
    async initializeKeysOnLogin(password: string, userId: string): Promise<void> {
        const meta = await KeyManager.getDerivationMeta(userId);

        if (!meta) {
            // User signed up before encryption was added — initialize fresh
            await KeyManager.initializeKeysOnSignup(password, userId);
            return;
        }

        const masterKey = await deriveKeyFromPassword(
            password,
            meta.salt,
            meta.iterations,
        );

        // Derive chat keypair and verify against stored public key
        const chatKeyPair = deriveChatKeyPair(masterKey);
        const storedPublicKey = await KeyManager.getPublicKey(userId);

        if (storedPublicKey) {
            const derivedPub = encodeBase64(chatKeyPair.publicKey);
            const storedPub = encodeBase64(storedPublicKey);

            if (derivedPub !== storedPub) {
                throw new AppError(
                    'Key verification failed. The password may be incorrect or keys were rotated.',
                    ErrorCode.ENCRYPTION_ERROR,
                    'Unable to unlock your encrypted data. Please verify your password and try again.',
                );
            }
        }

        const fieldKey = deriveFieldEncryptionKey(masterKey);

        // Store & cache
        await secureSet(SECURE_KEY_MASTER, encodeBase64(masterKey));
        await secureSet(SECURE_KEY_SALT, meta.salt);
        cachedMasterKey = masterKey;
        cachedChatKeyPair = chatKeyPair;
        cachedFieldKey = fieldKey;

        // One-time migration: reduce stored iterations from legacy 100k → 10k
        // for faster future logins on the fallback pure-JS path.
        if (meta.iterations > KDF_ITERATIONS) {
            try {
                const privateKeysRef = KeyManager._getPrivateKeysRef(userId);
                await setDoc(privateKeysRef, { keyIterations: KDF_ITERATIONS }, { merge: true });
            } catch {
                // Non-critical: will retry silently on next login
            }
        }
    },

    /** Check if a master key is available (in secure storage or memory). */
    async isKeyInitialized(): Promise<boolean> {
        if (cachedMasterKey) return true;
        const stored = await secureGet(SECURE_KEY_MASTER);
        return stored !== null;
    },

    /** Get or derive the master key from secure storage. */
    async getMasterKey(): Promise<Uint8Array | null> {
        if (cachedMasterKey) return cachedMasterKey;

        const stored = await secureGet(SECURE_KEY_MASTER);
        if (!stored) return null;

        cachedMasterKey = decodeBase64(stored);
        return cachedMasterKey;
    },

    /** Get or derive the chat keypair. */
    async getChatKeyPair(): Promise<nacl.BoxKeyPair | null> {
        if (cachedChatKeyPair) return cachedChatKeyPair;

        const masterKey = await KeyManager.getMasterKey();
        if (!masterKey) return null;

        cachedChatKeyPair = deriveChatKeyPair(masterKey);
        return cachedChatKeyPair;
    },

    /** Get or derive the field encryption key. */
    async getFieldEncryptionKey(): Promise<Uint8Array | null> {
        if (cachedFieldKey) return cachedFieldKey;

        const masterKey = await KeyManager.getMasterKey();
        if (!masterKey) return null;

        cachedFieldKey = deriveFieldEncryptionKey(masterKey);
        return cachedFieldKey;
    },

    /**
     * Fetch another user's public key from Firestore.
     * Cached in-memory for the session.
     */
    async getPublicKey(userId: string): Promise<Uint8Array | null> {
        const cached = publicKeyCache.get(userId);
        if (cached) return cached;

        const userRef = KeyManager._getPublicUserRef(userId);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) return null;

        const data = snapshot.data() as Partial<UserKeyData>;
        if (!data.publicKey) return null;

        const key = decodeBase64(data.publicKey);
        publicKeyCache.set(userId, key);
        return key;
    },

    /** Fetch key derivation metadata from Firestore. */
    async getDerivationMeta(userId: string): Promise<KeyDerivationMeta | null> {
        const privateRef = KeyManager._getPrivateKeysRef(userId);
        const privateSnapshot = await getDoc(privateRef);

        if (privateSnapshot.exists()) {
            const privateData = privateSnapshot.data();
            if (privateData.keySalt && privateData.keyIterations) {
                return {
                    salt: privateData.keySalt,
                    iterations: privateData.keyIterations,
                    version: privateData.keyDerivationVersion ?? 1,
                };
            }
        }

        // Backward compatibility: legacy fields on users/{userId}
        const userRef = KeyManager._getPublicUserRef(userId);
        const snapshot = await getDoc(userRef);
        if (!snapshot.exists()) return null;
        const data = snapshot.data();
        if (!data.keySalt || !data.keyIterations) return null;

        return {
            salt: data.keySalt,
            iterations: data.keyIterations,
            version: data.keyDerivationVersion ?? 1,
        };
    },

    /**
     * Publish key data to Firestore (used after ensureUserProfile creates the doc).
     * Only publishes the public key and version. Does NOT generate a new salt —
     * salt is always written during signup and stored locally as backup.
     */
    async publishKeyData(userId: string): Promise<void> {
        const chatKeyPair = await KeyManager.getChatKeyPair();
        if (!chatKeyPair) return;

        const userRef = KeyManager._getPublicUserRef(userId);
        const privateKeysRef = KeyManager._getPrivateKeysRef(userId);
        const updateData: Record<string, any> = {
            publicKey: encodeBase64(chatKeyPair.publicKey),
            keyVersion: KEY_VERSION,
        };

        // Check if salt needs to be written (first publish after signup race condition)
        const existingMeta = await KeyManager.getDerivationMeta(userId);
        if (!existingMeta) {
            // Try to recover salt from local secure storage
            const localSalt = await secureGet(SECURE_KEY_SALT);
            if (localSalt) {
                await setDoc(privateKeysRef, {
                    keySalt: localSalt,
                    keyIterations: KDF_ITERATIONS,
                    keyDerivationVersion: KEY_VERSION,
                }, { merge: true });
            }
        }

        await updateDoc(userRef, updateData);
    },

    /** Clear all keys from memory and secure storage (sign-out). */
    async clearKeys(): Promise<void> {
        cachedMasterKey = null;
        cachedChatKeyPair = null;
        cachedFieldKey = null;
        publicKeyCache.clear();
        await secureDelete(SECURE_KEY_MASTER);
        await secureDelete(SECURE_KEY_SALT);
    },
};
