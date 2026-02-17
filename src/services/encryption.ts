/**
 * Core Encryption Service for DreamSync
 *
 * Provides field-level symmetric encryption (XSalsa20-Poly1305 via nacl.secretbox)
 * and asymmetric encryption for chat (X25519 + XSalsa20-Poly1305 via nacl.box).
 *
 * Key derivation uses PBKDF2-HMAC-SHA256. Primary path: Web Crypto API (async,
 * native engine ~100x faster). Fallback: @noble/hashes pure-JS implementation.
 */

import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import nacl from 'tweetnacl';
import {
    decodeBase64,
    decodeUTF8,
    encodeBase64,
    encodeUTF8,
} from 'tweetnacl-util';
import { BucketItem } from '../types/item';
import {
    EncryptedChatKey,
    EncryptedField,
    EncryptedMessagePayload,
} from '../types/encryption';

const ENCRYPTION_VERSION = 1;
const KDF_DOMAIN_CHAT = 'dreamsync:chat-keypair';
const KDF_DOMAIN_FIELD = 'dreamsync:field-key';

// ---------------------------------------------------------------------------
// Key Derivation
// ---------------------------------------------------------------------------

/**
 * Derive a 32-byte master key from a password + salt using PBKDF2-HMAC-SHA256.
 *
 * Primary path: Web Crypto API (async, native engine) — available in Hermes
 * (RN 0.73+), browsers, and Node 15+. ~100x faster than pure-JS on device.
 * Fallback: @noble/hashes pure-JS (synchronous) for compatibility.
 */
export async function deriveKeyFromPassword(
    password: string,
    salt: string,
    iterations: number,
): Promise<Uint8Array> {
    const passwordBytes = new TextEncoder().encode(password);
    const saltBytes = new TextEncoder().encode(salt);

    // Primary path: Web Crypto API (async, native, ~100x faster than pure JS)
    if (typeof globalThis.crypto?.subtle?.deriveBits === 'function') {
        try {
            const keyMaterial = await globalThis.crypto.subtle.importKey(
                'raw',
                passwordBytes,
                { name: 'PBKDF2' },
                false,
                ['deriveBits'],
            );
            const bits = await globalThis.crypto.subtle.deriveBits(
                { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
                keyMaterial,
                256,
            );
            return new Uint8Array(bits);
        } catch {
            // Fall through to pure-JS path if crypto.subtle fails
        }
    }

    // Fallback: pure JS via @noble/hashes (synchronous, kept for compatibility)
    return pbkdf2(sha256, passwordBytes, saltBytes, {
        c: iterations,
        dkLen: 32,
    });
}

/**
 * Derive an X25519 keypair for chat from the master key using domain separation.
 */
export function deriveChatKeyPair(
    masterKey: Uint8Array,
): nacl.BoxKeyPair {
    const input = decodeUTF8(encodeBase64(masterKey) + KDF_DOMAIN_CHAT);
    const seed = sha256(input);
    return nacl.box.keyPair.fromSecretKey(seed);
}

/**
 * Derive a 32-byte field encryption key from the master key using domain separation.
 */
export function deriveFieldEncryptionKey(
    masterKey: Uint8Array,
): Uint8Array {
    const input = decodeUTF8(encodeBase64(masterKey) + KDF_DOMAIN_FIELD);
    return sha256(input);
}

// ---------------------------------------------------------------------------
// Symmetric Encryption (for fields + group chat)
// ---------------------------------------------------------------------------

/** Encrypt a plaintext string with a 32-byte symmetric key. */
export function encryptField(plaintext: string, key: Uint8Array): EncryptedField {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const messageBytes = decodeUTF8(plaintext);
    const ciphertext = nacl.secretbox(messageBytes, nonce, key);

    return {
        c: encodeBase64(ciphertext),
        n: encodeBase64(nonce),
        v: ENCRYPTION_VERSION,
    };
}

/** Decrypt an EncryptedField back to a plaintext string. Returns null on failure. */
export function decryptField(
    encrypted: EncryptedField,
    key: Uint8Array,
): string | null {
    try {
        const ciphertext = decodeBase64(encrypted.c);
        const nonce = decodeBase64(encrypted.n);
        const plaintext = nacl.secretbox.open(ciphertext, nonce, key);

        if (!plaintext) return null;
        return encodeUTF8(plaintext);
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Asymmetric Encryption (for DM chat + key exchange)
// ---------------------------------------------------------------------------

/** Encrypt a message for a specific recipient (DM). */
export function encryptForRecipient(
    plaintext: string,
    senderSecretKey: Uint8Array,
    recipientPublicKey: Uint8Array,
    senderPublicKey: Uint8Array,
): EncryptedMessagePayload {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageBytes = decodeUTF8(plaintext);
    const ciphertext = nacl.box(messageBytes, nonce, recipientPublicKey, senderSecretKey);

    return {
        ciphertext: encodeBase64(ciphertext),
        nonce: encodeBase64(nonce),
        senderPublicKey: encodeBase64(senderPublicKey),
        version: ENCRYPTION_VERSION,
    };
}

/** Decrypt a message from a sender (DM). Returns null on failure. */
export function decryptFromSender(
    payload: EncryptedMessagePayload,
    recipientSecretKey: Uint8Array,
    senderPublicKey: Uint8Array,
): string | null {
    try {
        const ciphertext = decodeBase64(payload.ciphertext);
        const nonce = decodeBase64(payload.nonce);
        const plaintext = nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey);

        if (!plaintext) return null;
        return encodeUTF8(plaintext);
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Group Key Management
// ---------------------------------------------------------------------------

/** Generate a random 32-byte symmetric key for group chat. */
export function generateGroupKey(): Uint8Array {
    return nacl.randomBytes(32);
}

/** Encrypt a group key for a specific user using asymmetric encryption. */
export function encryptGroupKeyForUser(
    groupKey: Uint8Array,
    senderSecretKey: Uint8Array,
    recipientPublicKey: Uint8Array,
    senderPublicKey: Uint8Array,
): EncryptedChatKey {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const encrypted = nacl.box(groupKey, nonce, recipientPublicKey, senderSecretKey);

    return {
        encryptedKey: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
        senderPublicKey: encodeBase64(senderPublicKey),
    };
}

/** Decrypt a group key that was encrypted for the current user. */
export function decryptGroupKey(
    encryptedChatKey: EncryptedChatKey,
    recipientSecretKey: Uint8Array,
    senderPublicKey: Uint8Array,
): Uint8Array | null {
    try {
        const encrypted = decodeBase64(encryptedChatKey.encryptedKey);
        const nonce = decodeBase64(encryptedChatKey.nonce);
        const groupKey = nacl.box.open(encrypted, nonce, senderPublicKey, recipientSecretKey);

        return groupKey ?? null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Field-Level Helpers for Dreams and Profiles
// ---------------------------------------------------------------------------

/**
 * Encrypt sensitive fields of a private dream item.
 * Only encrypts when isPublic === false. Returns a new object (immutable).
 */
export function encryptDreamFields(
    item: Partial<BucketItem>,
    fieldKey: Uint8Array,
): Partial<BucketItem> {
    const result = { ...item } as any;
    const isPublicDream = result.isPublic === true;

    // Scalar fields
    if (typeof result.location === 'string' && result.location) {
        result.location = encryptField(result.location, fieldKey);
    }
    if (typeof result.budget === 'number') {
        result.budget = encryptField(String(result.budget), fieldKey);
    }

    // Always-encrypted arrays (also when dream is public)
    if (Array.isArray(result.expenses)) {
        result.expenses = result.expenses.map((e: any) => ({
            ...e,
            title: typeof e.title === 'string' ? encryptField(e.title, fieldKey) : e.title,
            amount: typeof e.amount === 'number' ? encryptField(String(e.amount), fieldKey) : e.amount,
            category: typeof e.category === 'string' ? encryptField(e.category, fieldKey) : e.category,
        }));
    }
    if (Array.isArray(result.progress)) {
        result.progress = result.progress.map((p: any) => ({
            ...p,
            title: typeof p.title === 'string' ? encryptField(p.title, fieldKey) : p.title,
            description: typeof p.description === 'string'
                ? encryptField(p.description, fieldKey)
                : p.description,
            imageUrl: typeof p.imageUrl === 'string' ? encryptField(p.imageUrl, fieldKey) : p.imageUrl,
        }));
    }

    // Only fully private dreams encrypt story/media fields.
    if (!isPublicDream) {
        if (Array.isArray(result.reflections)) {
            result.reflections = result.reflections.map((r: any) => ({
                ...r,
                answer: typeof r.answer === 'string' ? encryptField(r.answer, fieldKey) : r.answer,
                contentBlocks: Array.isArray(r.contentBlocks)
                    ? r.contentBlocks.map((block: any) => ({
                        ...block,
                        value: typeof block.value === 'string' ? encryptField(block.value, fieldKey) : block.value,
                        caption: typeof block.caption === 'string' ? encryptField(block.caption, fieldKey) : block.caption,
                    }))
                    : r.contentBlocks,
            }));
        }
        if (Array.isArray(result.memories)) {
            result.memories = result.memories.map((m: any) => ({
                ...m,
                caption: typeof m.caption === 'string' ? encryptField(m.caption, fieldKey) : m.caption,
                imageUrl: typeof m.imageUrl === 'string' ? encryptField(m.imageUrl, fieldKey) : m.imageUrl,
            }));
        }
        if (Array.isArray(result.inspirations)) {
            result.inspirations = result.inspirations.map((i: any) => ({
                ...i,
                content: typeof i.content === 'string' ? encryptField(i.content, fieldKey) : i.content,
                caption: typeof i.caption === 'string' ? encryptField(i.caption, fieldKey) : i.caption,
            }));
        }
    }

    result.encryptionVersion = ENCRYPTION_VERSION;
    return result;
}

/**
 * Decrypt sensitive fields of a private dream item.
 * Returns a new object with plaintext fields (immutable).
 */
export function decryptDreamFields(
    item: BucketItem,
    fieldKey: Uint8Array,
): BucketItem {
    if (!item.encryptionVersion) return item;

    const result = { ...item } as any;

    // Scalar fields
    if (isEncryptedField(result.location)) {
        result.location = decryptField(result.location, fieldKey) ?? '';
    }
    if (isEncryptedField(result.budget)) {
        const raw = decryptField(result.budget, fieldKey);
        result.budget = raw !== null ? parseFloat(raw) : 0;
    }

    // Array fields
    if (Array.isArray(result.reflections)) {
        result.reflections = result.reflections.map((r: any) => ({
            ...r,
            answer: isEncryptedField(r.answer) ? (decryptField(r.answer, fieldKey) ?? '') : r.answer,
            contentBlocks: Array.isArray(r.contentBlocks)
                ? r.contentBlocks.map((block: any) => ({
                    ...block,
                    value: isEncryptedField(block.value) ? (decryptField(block.value, fieldKey) ?? '') : block.value,
                    caption: isEncryptedField(block.caption) ? (decryptField(block.caption, fieldKey) ?? '') : block.caption,
                }))
                : r.contentBlocks,
        }));
    }
    if (Array.isArray(result.memories)) {
        result.memories = result.memories.map((m: any) => ({
            ...m,
            caption: isEncryptedField(m.caption) ? (decryptField(m.caption, fieldKey) ?? '') : m.caption,
            imageUrl: isEncryptedField(m.imageUrl) ? (decryptField(m.imageUrl, fieldKey) ?? '') : m.imageUrl,
        }));
    }
    if (Array.isArray(result.expenses)) {
        result.expenses = result.expenses.map((e: any) => ({
            ...e,
            title: isEncryptedField(e.title) ? (decryptField(e.title, fieldKey) ?? '') : e.title,
            amount: isEncryptedField(e.amount)
                ? parseFloat(decryptField(e.amount, fieldKey) ?? '0')
                : e.amount,
            category: isEncryptedField(e.category) ? (decryptField(e.category, fieldKey) ?? 'other') : e.category,
        }));
    }
    if (Array.isArray(result.progress)) {
        result.progress = result.progress.map((p: any) => ({
            ...p,
            title: isEncryptedField(p.title)
                ? (decryptField(p.title, fieldKey) ?? '')
                : p.title,
            description: isEncryptedField(p.description)
                ? (decryptField(p.description, fieldKey) ?? '')
                : p.description,
            imageUrl: isEncryptedField(p.imageUrl)
                ? (decryptField(p.imageUrl, fieldKey) ?? '')
                : p.imageUrl,
        }));
    }
    if (Array.isArray(result.inspirations)) {
        result.inspirations = result.inspirations.map((i: any) => ({
            ...i,
            content: isEncryptedField(i.content) ? (decryptField(i.content, fieldKey) ?? '') : i.content,
            caption: isEncryptedField(i.caption) ? (decryptField(i.caption, fieldKey) ?? '') : i.caption,
        }));
    }

    return result as BucketItem;
}

/**
 * Encrypt sensitive profile fields. Returns a new object.
 * NOTE: Bio is NOT encrypted - it's public for cross-user visibility.
 * Only email is encrypted for privacy.
 */
export function encryptProfileFields(
    profile: Record<string, any>,
    fieldKey: Uint8Array,
): Record<string, any> {
    const result = { ...profile };

    // Only encrypt email, not bio (bio is public)
    if (typeof result.email === 'string' && result.email) {
        result.email = encryptField(result.email, fieldKey);
    }

    return result;
}

/**
 * Decrypt sensitive profile fields. Returns a new object.
 * NOTE: Bio is NOT encrypted anymore - it's public.
 * Only email is encrypted for privacy.
 */
export function decryptProfileFields(
    profile: Record<string, any>,
    fieldKey: Uint8Array,
): Record<string, any> {
    const result = { ...profile };

    // Only decrypt email, not bio (bio is plaintext now)
    if (isEncryptedField(result.email)) {
        result.email = decryptField(result.email, fieldKey) ?? '';
    }

    return result;
}

// ---------------------------------------------------------------------------
// Detection Helper
// ---------------------------------------------------------------------------

/**
 * Check if a value looks like an EncryptedField envelope.
 * Used to detect encrypted fields before rendering or processing.
 */
export function isEncryptedField(value: unknown): value is EncryptedField {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    return (
        typeof obj.c === 'string' &&
        typeof obj.n === 'string' &&
        typeof obj.v === 'number'
    );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Generate a cryptographically random salt as a base64 string. */
export function generateSalt(): string {
    return encodeBase64(nacl.randomBytes(32));
}

