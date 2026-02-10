# Encryption Verification Scripts

This directory contains helper scripts to verify and troubleshoot data encryption in DreamSync.

## Prerequisites

```bash
npm install dotenv
```

Ensure your `.env` file has all required Firebase configuration variables.

## Scripts

### 1. Get Your User ID

**Purpose:** Find your Firebase user ID so you can run the verification script.

**Usage:**

```bash
# Interactive mode (prompts for email and password)
npx ts-node scripts/getUserId.ts

# Or provide email directly
npx ts-node scripts/getUserId.ts your-email@example.com
```

**Output:** Your Firebase user ID (UID) that you'll use for the verification script.

---

### 2. Verify Encryption Status

**Purpose:** Check which data is encrypted vs. plain text in your Firebase database.

**Usage:**

```bash
# Check user profile and dreams only
npx ts-node scripts/verifyEncryption.ts <userId>

# Check user profile, dreams, AND messages in a specific chat
npx ts-node scripts/verifyEncryption.ts <userId> <chatId>
```

**Example:**

```bash
npx ts-node scripts/verifyEncryption.ts abc123xyz
npx ts-node scripts/verifyEncryption.ts abc123xyz chat-room-789
```

**Output:** Detailed report showing encryption status for:
- User profile (email, bio)
- Private dreams (reflections, memories, expenses)
- Chat messages (encrypted vs. plain text)

**Expected Results:**

| Data | Status | Explanation |
|------|--------|-------------|
| User profile | ✅ Encrypted | Profile fields should be encrypted |
| New private dreams | ✅ Encrypted | Dreams created after reauth |
| Old private dreams | ❌ Plain text → ✅ Encrypted | Lazy migration on first view |
| New messages | ✅ Encrypted | Messages sent after reauth |
| Old messages | ❌ Plain text | Messages sent before keys existed (expected) |
| Public dreams | ✅ Plain text | Always plain text (by design) |

---

## How to Find Chat ID

To check message encryption, you need a chat ID. Here's how to find it:

### Option 1: From Firebase Console

1. Open Firebase Console → Realtime Database
2. Expand the `messages/` node
3. Copy one of the chat IDs (e.g., `chat-123abc`)

### Option 2: From App (Developer Mode)

1. Open the app
2. Navigate to a chat room
3. Open React Native debugger / Chrome DevTools
4. Check the `useChatStore` state in console
5. Look for `chatId` in the current chat object

---

## Troubleshooting

### "Module not found: dotenv"

```bash
npm install dotenv
```

### "Cannot find module 'ts-node'"

```bash
npm install -g ts-node
# Or use npx (recommended)
npx ts-node scripts/verifyEncryption.ts
```

### "Authentication failed"

Make sure you're using the correct email and password for your DreamSync account.

### "No dreams/messages found"

- Make sure you're using the correct user ID
- Check that you have actually created dreams/messages in the app
- Check Firebase Console to verify data exists

---

## Related Documentation

- [Full Encryption Status Guide](../docs/ENCRYPTION_STATUS.md) - Comprehensive explanation of encryption behavior
- [Data Privacy Setup](../docs/DATA_PRIVACY_SETUP.md) - Implementation details and architecture

---

## Support

If you encounter issues or have questions:

1. Read the [Encryption Status Guide](../docs/ENCRYPTION_STATUS.md) first
2. Check Firebase Console to see raw data
3. Look for console errors in the app
4. Check that reauth flow completed successfully
