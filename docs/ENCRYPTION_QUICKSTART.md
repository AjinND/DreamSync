# Encryption Verification Quickstart

**TL;DR:** Your encryption is working correctly. Old data is plain text because it was created before you had encryption keys. New data is being encrypted.

## Quick Check (5 minutes)

### Step 1: Get Your User ID

```bash
npx ts-node scripts/getUserId.ts
```

Enter your email and password when prompted. Copy the user ID shown.

### Step 2: Run Verification

```bash
npx ts-node scripts/verifyEncryption.ts <paste-your-user-id-here>
```

### Step 3: Check Results

**✅ Good (encryption working):**
- User profile: `✅ ENCRYPTED`
- New dreams: `✅ ENCRYPTED`
- New messages: `✅ ENCRYPTED`

**⚠️ Expected (old data):**
- Old messages: `❌ PLAIN TEXT` (created before keys existed)
- Old dreams: `❌ PLAIN TEXT` (will encrypt when you open them)

**❌ Problem (needs investigation):**
- User profile: `❌ PLAIN TEXT`
- New dreams: `❌ PLAIN TEXT`
- New messages: `❌ PLAIN TEXT`

## What to Do

### If verification shows ✅ (encryption working)

**You're all set!** Encryption is working correctly.

**What about old plain text data?**
- Old messages: Will remain plain text (this is intentional)
- Old private dreams: Open each dream once - they'll encrypt automatically
- No action needed for new data

### If verification shows ❌ (encryption not working)

Something went wrong with key initialization. Check:

1. Did you go through the reauth screen after the PRNG fix?
2. Did you enter your password successfully?
3. Are there any errors in the app console?

**To fix:**
1. Sign out of the app
2. Sign back in
3. Go through reauth screen when prompted
4. Enter your password
5. Run verification again

## Why Some Data Is Plain Text

### Timeline
1. You created account → dreams and messages (no encryption yet)
2. Encryption code added → but PRNG bug prevented it from running
3. PRNG fixed → but you still didn't have keys
4. Reauth completed → keys generated ✅
5. **Old data remains plain text** (created before step 4)

### What's Encrypted Now
- ✅ All NEW private dreams
- ✅ All NEW messages
- ✅ User profile (after update)
- ✅ Old dreams (after you open them once)

### What's Not Encrypted
- ❌ Old messages (intentional - forward-only encryption)
- ❌ Public dreams (intentional - always plain text)

## Options Going Forward

### Option 1: Keep Current Account (Recommended)
- ✅ No data loss
- ✅ All new data encrypted
- ✅ Old dreams encrypt as you use them
- ❌ Old messages stay plain text

**Action:** Just keep using the app normally. Open old private dreams once to trigger encryption.

### Option 2: Fresh Start
- ✅ 100% encrypted from day one
- ❌ Lose all existing data

**Action:** Sign out, clear app data, create new account.

## Full Documentation

- [ENCRYPTION_STATUS.md](docs/ENCRYPTION_STATUS.md) - Complete explanation and troubleshooting
- [DATA_PRIVACY_ENCRYPTION.md](docs/DATA_PRIVACY_ENCRYPTION.md) - Technical implementation details
- [scripts/README.md](scripts/README.md) - Script usage details

## Need Help?

1. Run verification script first
2. Read [ENCRYPTION_STATUS.md](docs/ENCRYPTION_STATUS.md)
3. Check Firebase Console to see raw data
4. Look for console errors in the app
