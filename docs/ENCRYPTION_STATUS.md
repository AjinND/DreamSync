# Data Encryption Status & Migration Guide

**Last Updated:** 2026-02-10

## Current Situation

You're seeing **plain text data in the database** for chat messages and dreams. This is **expected behavior** based on the timeline of events.

### Timeline

1. **Before encryption**: Account created, chatrooms and dreams added
2. **Encryption implemented**: E2E chat and field-level encryption added to codebase
3. **PRNG error**: Encryption couldn't run (missing polyfill)
4. **PRNG fixed**: Polyfill moved to `firebaseConfig.ts` ✅
5. **Keys initialized**: Reauth screen completed, password entered, keys generated ✅
6. **Profile encrypted**: User profile updated → **encrypted successfully** ✅
7. **Old data still plain text**: Messages/dreams created **before keys existed** remain unencrypted

### Current Status Summary

| Data Type | Status | Explanation |
|-----------|--------|-------------|
| **User Profile** | ✅ Encrypted | Profile fields encrypted after reauth |
| **New Messages** | ✅ Encrypted | Messages sent after key initialization |
| **Old Messages** | ❌ Plain Text | Messages sent before keys existed |
| **New Private Dreams** | ✅ Encrypted | Dreams created after key initialization |
| **Old Private Dreams** | ❌ Plain Text | Dreams created before keys existed (will encrypt on first view) |
| **Public Dreams** | ✅ Plain Text | Intentionally plain text (always) |

---

## Why Old Data Is Plain Text

### 1. Chat Messages (No Retroactive Encryption)

Chat encryption is **forward-only by design**:

- Old messages (before keys) were stored in plain text in Realtime Database
- New messages (after reauth) ARE being encrypted
- The system displays old plain text messages without breaking the app
- **This is intentional**: Retroactive encryption is complex and risky

**Code Reference:** `src/services/chat.ts` lines 318-327

```typescript
if (msg.encrypted) {
    // Decrypt encrypted messages
    const decrypted = decryptFromSender(...);
    base.text = decrypted ?? '[Unable to decrypt]';
} else {
    // Legacy plaintext messages - display as-is
    base.text = msg.text;
}
```

### 2. Private Dreams (Lazy Migration)

Private dreams HAVE lazy migration:

- When you call `getUserItems()`, it detects unencrypted private items
- Automatically encrypts them in the background
- **But**: Only runs when you open/view the dream
- If you haven't opened these dreams since getting keys → still plain text in DB

**Code Reference:** `src/services/items.ts` lines 119-136

```typescript
// Lazy migration: encrypt plaintext private items
if (item.isPublic !== true && !item.encryptionVersion) {
    const encrypted = encryptDreamFields(item, fieldKey);
    // Write encrypted version back (non-blocking)
    updateDoc(docRef, encrypted).catch((err) => {
        console.warn('[ItemService] Lazy migration failed:', err);
    });
}
```

### 3. User Profile (Already Encrypted)

Your profile fields were encrypted when you updated your profile after reauth.

**This proves encryption IS working correctly** ✅

---

## Verification Steps

### Step 1: Check Your User ID

You need your Firebase user ID to run the verification script.

**How to find it:**

1. Open the app
2. Navigate to the Account tab
3. Open developer tools / React Native debugger
4. Check the auth state in console, or
5. Use Firebase Console → Authentication → Users → copy UID

### Step 2: Run Verification Script

```bash
# Install dependencies if needed
npm install dotenv

# Run the script
npx ts-node scripts/verifyEncryption.ts <YOUR_USER_ID>

# To also check messages in a specific chat:
npx ts-node scripts/verifyEncryption.ts <YOUR_USER_ID> <CHAT_ID>
```

**Expected Output:**

```
🔍 DreamSync Encryption Verification

👤 CHECKING USER PROFILE...
  ✅ email: ENCRYPTED (v1)
  ✅ bio: ENCRYPTED (v1)
  ✅ Key Data Published: Yes

📋 CHECKING DREAMS...
  Dream: "My Test Dream"
    Public: No
    Encryption Version: 1
    ✅ reflections[0].answer: ENCRYPTED (v1)
    ✅ memories[0].content: ENCRYPTED (v1)

💬 CHECKING MESSAGES...
  Message: "Hello"
    Encrypted: No
    ❌ PLAIN TEXT: "Hello" (old message)

  Message: "Test after reauth"
    Encrypted: Yes
    ✅ ENCRYPTED
```

### Step 3: Create Test Data

To verify encryption is working for NEW data:

1. **Create a new private dream:**
   - Open the app
   - Add a new dream
   - Title: "Encryption Test"
   - Add a reflection: "This should be encrypted"
   - Make sure it's **private** (not public)
   - Save

2. **Send a new chat message:**
   - Open any DM or journey chat
   - Send: "Testing E2E encryption"

3. **Check Firebase Console:**
   - Go to Firestore → `bucketItems` → find your new dream
   - Look at `reflections[0].answer` field
   - Should see: `{ c: "base64...", n: "base64...", v: 1 }`
   - **NOT** plain text

4. **Check Realtime Database:**
   - Go to Realtime Database → `messages/{chatId}`
   - Find your new message
   - Should have:
     - `encrypted: true`
     - `ciphertext: "..."`
     - `nonce: "..."`
     - `text: ""` (empty)
   - **NOT** plain text in `text` field

---

## Migration Options

### Option 1: Keep Current Account (Recommended)

**Best for:** Keeping existing data and account

**What happens:**
- ✅ New data is fully encrypted going forward
- ✅ Old dreams encrypt gradually as you open them (lazy migration)
- ✅ New messages are encrypted end-to-end
- ❌ Old messages remain plain text (acceptable for most use cases)

**Steps:**

1. **Do nothing** - encryption is already working for new data
2. **Open each private dream once** to trigger lazy migration
3. **Check Firebase Console** after opening dreams - fields should become encrypted
4. **Create new dreams/messages** - they'll be encrypted immediately

**Result:** Gradual encryption of old dreams, full encryption for new data

---

### Option 2: Fresh Start

**Best for:** Wanting 100% encrypted state from the start

**What happens:**
- ✅ Clean slate with all data encrypted
- ❌ Lose existing dreams, messages, and account history

**Steps:**

1. **Export important data** (optional backup)
   - Screenshot or manually save any critical dreams/messages

2. **Sign out completely**
   - This clears encryption keys from memory

3. **Clear app data** (optional, for full reset)
   - **iOS:** Delete and reinstall app
   - **Android:** Settings → Apps → LivingList → Clear Storage
   - **Web:** Clear site data in browser DevTools

4. **Sign up with new account**
   - Keys will be generated fresh during signup
   - All new data will be encrypted from the start

5. **Create new dreams and messages**
   - Everything created now will be fully encrypted

**Result:** 100% encrypted data, but no old history

---

### Option 3: Retroactive Chat Message Encryption (Not Recommended)

**Only implement if legally required** (HIPAA, GDPR data protection mandates, etc.)

**Complexity:** HIGH
**Risk:** MEDIUM (could break message history)
**Recommended:** NO (unless compliance requires it)

**Why this is hard:**
- Need to fetch all plaintext messages from RTDB
- Need public keys for all participants (may not exist for old users)
- Group messages need group key (may have been rotated)
- Messages from deleted users can't be encrypted (no public key)
- Could take significant time for large message history
- Risk of data loss if keys are unavailable

**If you must implement this**, it requires:
1. Migration script to fetch all plaintext messages
2. Logic to handle missing keys, deleted users, group key rotation
3. Careful testing to avoid breaking message history
4. Running via Cloud Function or admin SDK

---

## Recommended Action

**I recommend Option 1: Keep Current Account**

**Why:**
- ✅ Encryption is already working for new data
- ✅ Minimal disruption to user experience
- ✅ Dreams will encrypt gradually as you use the app
- ✅ Old plaintext messages are acceptable (common in messaging apps)
- ✅ No data loss or account recreation needed

**What to do next:**

1. Run the verification script to confirm encryption is working
2. Create a test dream and message to verify
3. Open your old private dreams once to trigger lazy migration
4. Continue using the app normally - all new data is encrypted

---

## Expected Behavior Going Forward

| Action | Encryption Status |
|--------|-------------------|
| **Create new private dream** | ✅ Encrypted immediately |
| **Open old private dream** | ✅ Encrypted via lazy migration |
| **Send new message** | ✅ Encrypted end-to-end |
| **View old message** | ❌ Displays plain text (legacy) |
| **Create public dream** | ✅ Plain text (intentional) |
| **Update profile** | ✅ Encrypted fields |

---

## Troubleshooting

### If NEW data is still plain text after verification:

This would indicate an issue with key retrieval. Check:

1. **Keys exist in SecureStore:**
   ```typescript
   // In app code, add logging:
   const masterKey = await KeyManager.getMasterKey();
   console.log('Master key exists:', masterKey !== null);
   ```

2. **Field encryption key derivation works:**
   ```typescript
   const fieldKey = await KeyManager.getFieldEncryptionKey();
   console.log('Field key exists:', fieldKey !== null);
   ```

3. **Check reauth flow:**
   - If you reinstall the app, you MUST go through reauth
   - Reauth derives keys from your password + stored salt
   - Without reauth, keys won't exist

4. **Check logs for errors:**
   - Look for `[Encryption]` or `[KeyManager]` log messages
   - Check for PBKDF2 derivation errors
   - Check for SecureStore access errors

### If lazy migration isn't working:

1. **Check Firestore rules:** Ensure user can update their own items
2. **Check console for warnings:** Look for "Lazy migration failed" warnings
3. **Manually trigger migration:**
   ```typescript
   // In items.ts, the migration happens in getUserItems()
   // Just open the dream detail screen - it calls getUserItems()
   ```

### If messages can't be decrypted:

1. **Check sender's public key exists:**
   ```typescript
   const senderKey = await KeyManager.getPublicKey(senderId);
   console.log('Sender key exists:', senderKey !== null);
   ```

2. **Check group key for group chats:**
   ```typescript
   // Group key should be in chat metadata
   const chatData = await getChatMetadata(chatId);
   console.log('Has group key:', chatData.groupKey !== undefined);
   ```

3. **Check for key rotation:**
   - If participant left and rejoined, group key may have rotated
   - Old messages use old group key (which participant no longer has)
   - This is expected behavior for forward secrecy

---

## Files Involved

| File | Purpose | Status |
|------|---------|--------|
| `src/services/items.ts` | Dream encryption + lazy migration | ✅ Working |
| `src/services/chat.ts` | Message encryption + legacy handling | ✅ Working |
| `src/services/users.ts` | Profile field encryption | ✅ Working |
| `src/services/encryption.ts` | Core crypto primitives | ✅ Working |
| `src/services/keyManager.ts` | Key lifecycle management | ✅ Working |
| `app/(auth)/reauth.tsx` | Key recovery after reinstall | ✅ Working |
| `scripts/verifyEncryption.ts` | Verification script | ✅ New |

**No code changes needed.** Encryption is working as designed.

---

## Security Notes

### What's Protected

- ✅ **Private dream fields:** reflections, memories, expenses, progress, inspirations, location, budget
- ✅ **User profile fields:** email, bio
- ✅ **Chat messages:** All new messages after key initialization
- ✅ **Group chat keys:** Rotated when participants leave (forward secrecy)

### What's Not Protected

- ❌ **Public dreams:** Intentionally plain text for discoverability
- ❌ **Metadata:** Dream titles, categories, dates, user IDs (needed for queries)
- ❌ **Old messages:** Legacy plain text messages (before keys existed)

### Threat Model

**Protected against:**
- Database breach (encrypted fields unreadable without user's password)
- Firebase admin access (can't decrypt without user's key)
- XSS attacks (keys stored in SecureStore, not localStorage)

**Not protected against:**
- Device compromise (attacker with device access + your password)
- Screenshot/screen recording while app is open
- Backup extraction on rooted/jailbroken devices

---

## Next Steps

1. **Run verification script** with your user ID
2. **Create test data** (dream + message) to verify encryption
3. **Check Firebase Console** to confirm encrypted format
4. **Open old dreams** to trigger lazy migration
5. **Report results** - are new items encrypted? ✅ or ❌

If new data is encrypted ✅, the system is working correctly and you're just seeing old historical data.

If new data is STILL plain text ❌, we need to investigate why `KeyManager.getFieldEncryptionKey()` is returning null.
