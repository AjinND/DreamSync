/**
 * Encryption Types for DreamSync Data Privacy
 */

/** Envelope for a field-level encrypted value (symmetric, XSalsa20-Poly1305) */
export interface EncryptedField {
    /** Base64-encoded ciphertext */
    c: string;
    /** Base64-encoded nonce (24 bytes) */
    n: string;
    /** Encryption schema version */
    v: number;
}

/** Payload for an E2E encrypted chat message (asymmetric, X25519 + XSalsa20-Poly1305) */
export interface EncryptedMessagePayload {
    ciphertext: string;
    nonce: string;
    senderPublicKey: string;
    version: number;
}

/** Per-user encrypted copy of a group symmetric key */
export interface EncryptedChatKey {
    /** Base64-encoded encrypted group key */
    encryptedKey: string;
    /** Base64-encoded nonce */
    nonce: string;
    /** Public key of the user who encrypted this copy */
    senderPublicKey: string;
}

/** Public key metadata stored in Firestore users/{uid} */
export interface UserKeyData {
    publicKey: string;
    keyVersion: number;
}

/** Key derivation parameters stored in Firestore users/{uid} */
export interface KeyDerivationMeta {
    /** Base64-encoded salt */
    salt: string;
    /** Number of hash iterations */
    iterations: number;
    /** Derivation scheme version */
    version: number;
}
