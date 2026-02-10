# Data Privacy & Encryption

> **Version:** 1.0
> **Branch:** `feature/data-privacy-encryption`
> **Last Updated:** 2026-02-10

---

## Table of Contents

1. [Overview](#overview)
2. [What Was Implemented](#what-was-implemented)
3. [Architecture](#architecture)
4. [New Files](#new-files)
5. [Modified Files](#modified-files)
6. [Setup & Deployment Checklist](#setup--deployment-checklist)
7. [How It Works](#how-it-works)
8. [Existing User Migration](#existing-user-migration)
9. [Known Limitations](#known-limitations)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This feature adds end-to-end encryption for chat, field-level encryption for sensitive personal data, password-based key derivation, input validation, and fixes critical security rule gaps across Firebase services.

**Dependencies added:** `@noble/hashes`, `tweetnacl`, `tweetnacl-util`, `expo-secure-store`, `expo-crypto`, `zod`

---

## What Was Implemented

### 1. End-to-End Encrypted Chat

| Chat Type | Encryption | Algorithm |
|-----------|-----------|-----------|
| Direct Messages (DM) | Asymmetric | X25519 + XSalsa20-Poly1305 (`nacl.box`) |
| Journey Group Chat | Symmetric | XSalsa20-Poly1305 (`nacl.secretbox`) with shared group key |

- Messages are encrypted client-side before being written to RTDB
- Firestore chat metadata (`lastMessage.text`) shows `[Encrypted message]` instead of content
- Group keys are distributed per-participant and rotated when someone leaves
- Old plaintext messages remain readable (backward compatible)

### 2. Field-Level Encryption for Private Dreams

When a dream is private (`isPublic === false`), the following fields are encrypted at rest in Firestore:

| Field | Type | Encrypted As |
|-------|------|-------------|
| `location` | string | `EncryptedField` |
| `budget` | number | stringified, then `EncryptedField` |
| `reflections[].answer` | string | `EncryptedField` |
| `memories[].caption` | string | `EncryptedField` |
| `memories[].imageUrl` | string | `EncryptedField` |
| `expenses[].title` | string | `EncryptedField` |
| `expenses[].amount` | number | stringified, then `EncryptedField` |
| `expenses[].category` | string | `EncryptedField` |
| `progress[].description` | string | `EncryptedField` |
| `inspirations[].content` | string | `EncryptedField` |
| `inspirations[].caption` | string | `EncryptedField` |

Public dreams are always stored in plaintext for discoverability.

### 3. Field-Level Encryption for User Profiles

| Field | Encrypted |
|-------|-----------|
| `email` | Yes |
| `bio` | Yes |
| `displayName` | No (needed for display to other users) |
| `avatar` | No (URL, needed for display) |

### 4. Password-Based Key Derivation

- **Algorithm:** PBKDF2-HMAC-SHA256 via `@noble/hashes`
- **Iterations:** 100,000
- **Key length:** 32 bytes (256-bit)
- **Domain separation:** Master key is derived into a chat keypair and a field encryption key using SHA-256 with different domain strings

### 5. Key Lifecycle

| Event | What Happens |
|-------|-------------|
| **Signup** | Generate salt, derive master key, store in secure storage, publish public key + salt to Firestore |
| **Login** | Fetch salt from Firestore, re-derive master key, verify public key matches, store locally |
| **Cold start** (keys missing) | Redirect to reauth screen for password re-entry |
| **Sign out** | Clear all keys from memory and secure storage |

### 6. Input Validation (Zod)

| Schema | Validated Fields |
|--------|-----------------|
| `loginSchema` | email format, password min 8 chars |
| `signupSchema` | email format, password strength (uppercase + number + 8 chars) |
| `dreamSchema` | title (1-200), description (max 2000), category enum, phase enum, location, budget, tags |
| `messageSchema` | text (1-5000 chars), type enum |
| `profileUpdateSchema` | displayName (1-100), bio (max 500) |
| `expenseSchema` | title, amount (0-999M), category enum |

### 7. Security Rules Fixes

| Service | Before | After |
|---------|--------|-------|
| **RTDB** (`database.rules.json`) | `.read: false, .write: false` (all access blocked) | Auth-gated read/write, message validation, sender ID enforcement |
| **Firestore** (`firestore.rules`) | Comments world-readable (`allow read: if true`) | Comments require auth (`allow read: if request.auth != null`) |
| **Storage** (`storage.rules`) | Time-bomb expiration (2026-03-10) | Path-based rules: profile images (5MB), dream images (10MB), image content-type validation, deny everything else |

### 8. Cloud Function Update

Push notifications for encrypted messages display "Sent an encrypted message" instead of leaking plaintext content.

---

## Architecture

```
Password (never stored)
    │
    ▼
┌─────────────────────────────┐
│  PBKDF2-HMAC-SHA256         │  salt (stored in Firestore users/{uid})
│  100,000 iterations         │
└─────────────┬───────────────┘
              │
              ▼
      ┌── Master Key (32 bytes) ──┐
      │   (expo-secure-store)     │
      │                           │
      ▼                           ▼
 SHA-256 + domain           SHA-256 + domain
 "dreamsync:chat-keypair"   "dreamsync:field-key"
      │                           │
      ▼                           ▼
 X25519 KeyPair             Field Encryption Key
 (chat encryption)          (dream/profile encryption)
      │                           │
      ├─► DM: nacl.box           ├─► Dreams: nacl.secretbox
      └─► Group: encrypt         └─► Profiles: nacl.secretbox
          group key per user
```

### Encrypted Field Format (EncryptedField)

```json
{
  "c": "<base64 ciphertext>",
  "n": "<base64 nonce>",
  "v": 1
}
```

The `isEncryptedField()` helper detects this shape to differentiate encrypted from plaintext values.

---

## New Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/types/encryption.ts` | ~50 | Type definitions: `EncryptedField`, `EncryptedMessagePayload`, `EncryptedChatKey`, `UserKeyData`, `KeyDerivationMeta` |
| `src/services/encryption.ts` | ~380 | Core crypto: key derivation, symmetric/asymmetric encrypt/decrypt, dream/profile field helpers |
| `src/services/keyManager.ts` | ~290 | Key lifecycle: signup/login key generation, secure storage, public key publishing, in-memory caching |
| `src/services/validation.ts` | ~110 | Zod schemas and `validate()`/`safeValidate()` helpers |
| `app/(auth)/reauth.tsx` | ~180 | Password re-entry screen for cold-start key recovery |

## Modified Files

| File | Changes |
|------|---------|
| `src/types/chat.ts` | Encryption fields on `Message` and `Chat` |
| `src/types/item.ts` | `encryptionVersion` on `BucketItem` |
| `src/types/social.ts` | Key fields on `UserProfile` (`publicKey`, `keySalt`, etc.) |
| `src/services/chat.ts` | E2E encryption on send, decryption on subscribe, group key management |
| `src/services/items.ts` | Encrypt on create/update, decrypt on read, lazy migration, `skipEncryption` option |
| `src/services/journeys.ts` | Group key distribution on join, key rotation on leave |
| `src/services/users.ts` | Profile field encryption/decryption, key data publishing |
| `src/store/useBucketStore.ts` | Public/private encryption transitions |
| `src/stores/useChatStore.ts` | `decryptionError` state |
| `app/(auth)/login.tsx` | Validation + key derivation |
| `app/(auth)/signup.tsx` | Validation + key generation |
| `app/(auth)/_layout.tsx` | Reauth route |
| `app/_layout.tsx` | Key initialization check, clear on sign-out |
| `functions/src/triggers/chat.ts` | Encrypted message notification body |
| `database.rules.json` | Proper RTDB message rules |
| `firestore.rules` | Comments auth fix |
| `storage.rules` | Path-based access control |

---

## Setup & Deployment Checklist

### Step 1: Install Dependencies

```bash
npm install
```

This installs the 6 new packages: `@noble/hashes`, `tweetnacl`, `tweetnacl-util`, `expo-secure-store`, `expo-crypto`, `zod`.

### Step 2: Deploy Firebase Security Rules

All three rule sets need to be deployed. You can deploy them individually or all at once.

**Option A: Deploy all at once**

```bash
firebase deploy --only firestore:rules,database,storage
```

**Option B: Deploy individually**

```bash
# Firestore rules (comments auth fix)
firebase deploy --only firestore:rules

# Realtime Database rules (message validation)
firebase deploy --only database

# Storage rules (path-based access control)
firebase deploy --only storage
```

**Verify after deploying:**

- Go to Firebase Console > Firestore > Rules and confirm the comments rule on line 50 shows `request.auth != null`
- Go to Firebase Console > Realtime Database > Rules and confirm messages have validation rules
- Go to Firebase Console > Storage > Rules and confirm the time-bomb expiration is gone

### Step 3: Deploy Cloud Functions

The chat notification trigger was updated to handle encrypted messages:

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions:onNewChatMessage
```

Or deploy all functions:

```bash
firebase deploy --only functions
```

### Step 4: Rebuild the Native App

`expo-secure-store` is a native module. If you've only been using Expo Go, you'll need a development build:

```bash
# Create a development build (required for expo-secure-store)
npx expo prebuild
npx expo run:android   # or run:ios
```

If you're already using a custom dev client or EAS builds, just rebuild:

```bash
eas build --platform android --profile development
# or
eas build --platform ios --profile development
```

> **Web:** No native build needed. The web fallback uses `sessionStorage` (keys cleared when tab closes).

### Step 5: Firestore Indexes (If Needed)

No new composite indexes are required. The existing indexes should continue to work. If you see "missing index" errors in the console, create the suggested index from the Firebase Console link in the error message.

### Step 6: Test the Flow

1. **New user signup:**
   - Create a new account
   - Check Firebase Console > Firestore > `users/{uid}` — you should see `publicKey`, `keySalt`, `keyIterations`, `keyDerivationVersion` fields
   - Create a private dream with reflections or expenses — check Firestore and confirm fields are stored as `{ c: "...", n: "...", v: 1 }` objects, not plaintext

2. **Login on another device/tab:**
   - Log in with the same account
   - Verify dreams load correctly (decrypted on the client)
   - Verify profile email/bio display correctly

3. **DM chat:**
   - Open a DM between two users
   - Send a message — check RTDB (`messages/{chatId}/{msgId}`) and confirm `encrypted: true`, `ciphertext` present, `text: ""`
   - Verify both sender and recipient can read the message in the app

4. **Journey group chat:**
   - Create a journey, have another user join
   - Check Firestore `chats/{chatId}` for `encryptedKeys` map
   - Send a message — verify both participants can decrypt
   - Have a user leave — verify new messages use a rotated key

5. **Reauth flow:**
   - Clear app data (or on web, close and reopen the tab)
   - Reopen the app while still logged in
   - You should be redirected to the reauth screen asking for password
   - Enter password and verify access is restored

6. **Public/private toggle:**
   - Create a private dream (encrypted in Firestore)
   - Toggle it to public — verify Firestore fields become plaintext
   - Toggle it back to private — verify fields get encrypted again

---

## How It Works

### Encryption on Write

```
User creates private dream
        │
        ▼
  ItemService.createItem()
        │
        ├─ isPublic === true? → Store plaintext
        │
        └─ isPublic === false?
              │
              ▼
        KeyManager.getFieldEncryptionKey()
              │
              ▼
        encryptDreamFields(item, fieldKey)
              │
              ▼
        Write to Firestore (encrypted EncryptedField objects)
```

### Decryption on Read

```
User opens their dreams list
        │
        ▼
  ItemService.getUserItems()
        │
        ├─ item.encryptionVersion exists? → decryptDreamFields(item, fieldKey)
        │
        └─ Private but no encryptionVersion? → Lazy migration:
              encrypt & write back (non-blocking), return plaintext for now
```

### Chat Message Flow (DM)

```
Sender types message
        │
        ▼
  ChatService.sendMessage()
        │
        ├─ Get recipient's public key from Firestore (cached)
        ├─ encryptForRecipient(text, mySecretKey, theirPublicKey, myPublicKey)
        ├─ Write to RTDB: { encrypted: true, ciphertext, nonce, senderPublicKey }
        └─ Write to Firestore: lastMessage.text = "[Encrypted message]"

Recipient opens chat
        │
        ▼
  ChatService.subscribeToMessages()
        │
        ├─ msg.encrypted === true?
        │     ├─ DM + I'm sender → decrypt with counterparty's public key
        │     └─ DM + I'm recipient → decrypt with sender's public key
        │
        └─ msg.encrypted === undefined? → Display plaintext (legacy message)
```

---

## Existing User Migration

The system handles existing users and data gracefully through lazy migration:

| Scenario | What Happens |
|----------|-------------|
| **Existing user logs in** | If no `keySalt` in Firestore, treated as pre-encryption signup. Keys generated fresh as if new signup. |
| **Existing private dream read** | If `encryptionVersion` is missing, the item is plaintext. On read, it's encrypted and written back in the background. |
| **Existing profile read** | If `email`/`bio` are plaintext strings (not `EncryptedField` objects), they're encrypted and updated in the background. |
| **Existing chat messages** | Old plaintext messages stay as-is. They display normally (no `encrypted` flag). New messages are encrypted. |
| **Password requirements** | Existing users with weak passwords can still log in (login only validates format, not strength). Signup enforces uppercase + number. |

---

## Known Limitations

### Security

1. **RTDB read access** — Any authenticated user can read messages from any chat. Write access is validated (sender must match auth UID), but read-level participant checking requires denormalizing participant lists to RTDB, which is a larger migration. E2E encryption mitigates content exposure, but metadata (message existence, timing) is visible.

2. **Web key storage** — On web, master keys are stored in `sessionStorage` (cleared when tab closes). This is less secure than native `expo-secure-store` (hardware-backed keychain). Web users must re-enter their password each session.

3. **No key rotation** — If a user's password is compromised, there's no mechanism to rotate their field encryption key and re-encrypt all their data. This would require decrypting everything with the old key and re-encrypting with a new key.

4. **Single-device key derivation** — Keys are derived from the password. If the user forgets their password and resets it via Firebase Auth, their encryption keys are lost. All previously encrypted data becomes inaccessible.

### Functional

5. **No search on encrypted fields** — Encrypted dream fields cannot be searched or filtered server-side. Search must be done client-side after decryption.

6. **No offline encryption** — If the user's key is not initialized (e.g., reauth needed), private dreams cannot be viewed offline.

7. **Image content not encrypted** — Only image URLs and captions are encrypted in Firestore. The actual image files in Firebase Storage are not encrypted. Storage rules control access by path.

---

## Troubleshooting

### "Key verification failed" on login

The derived key doesn't match the stored public key. This means either:
- The password is incorrect
- The user's `keySalt` in Firestore was corrupted
- The user reset their Firebase Auth password

**Fix:** There's no automatic recovery. The user would need their original password. If `keySalt` was lost, check if a local backup exists in secure storage.

### Dreams show encrypted objects instead of text

The field encryption key is not available. This happens when:
- The user hasn't completed reauth after a reinstall
- The `KeyManager.getFieldEncryptionKey()` returns null

**Fix:** Sign out and sign back in, or navigate to the reauth screen.

### Chat messages show "[Unable to decrypt]"

- **DM:** The counterparty's public key may not be published yet (they signed up before encryption was added and haven't logged in since)
- **Group:** The user's encrypted group key entry is missing from `chat.encryptedKeys`

**Fix:** Both users should log out and log back in to ensure their keys are published. For group chats, leaving and rejoining the journey will re-distribute the group key.

### "Validation failed" errors on dream creation

Input doesn't match the Zod schema. Common issues:
- Title is empty or > 200 chars
- Budget is negative
- Category is not in the enum list

**Fix:** Check the validation error message for details.

### expo-secure-store not working

This is a native module that requires a custom development build. It does not work in Expo Go.

**Fix:** Run `npx expo prebuild` and use `npx expo run:android` or `npx expo run:ios`.

### RTDB "permission denied" errors

If you see permission denied errors for RTDB messages after deploying the new rules:
- Ensure the message data includes `senderId`, `text`, `type`, and `createdAt` fields
- Ensure `senderId` matches the authenticated user's UID

**Fix:** The chat service already structures messages correctly. If using the RTDB console for testing, ensure all required fields are present.
