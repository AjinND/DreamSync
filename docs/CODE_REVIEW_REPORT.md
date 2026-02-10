# Code Review Report — DreamSync

Date: 2026-02-10

## Scope
- Mobile app (Expo/React Native/TypeScript)
- Firebase security rules (Firestore, RTDB, Storage)
- Cloud Functions triggers
- Services and stores impacting auth, encryption, chat, community, and notifications

## Executive Summary
The codebase has a solid foundation (TypeScript strict mode, modular services, field-level encryption primitives, and reasonably constrained Storage rules), but there are several high-impact gaps in backend authorization and data integrity that could be abused in production.

Most urgent themes:
1. **Over-permissive Firestore rules** for chats, comments, journeys, and public-dream mutations.
2. **RTDB message write rule does not verify chat membership**, enabling authenticated users to write into arbitrary chat paths.
3. **Chat message schema mismatch between client and function trigger** likely breaks chat notifications.
4. **Code quality debt**: lint currently fails with errors and a large warning count.

---

## High Severity Findings

### 1) Firestore chat creation is too permissive
**Issue**
`/chats/{chatId}` allows any authenticated user to create any chat document without validating participants, chat type, or user inclusion. This allows malicious users to create chats that include other users or malformed payloads.

**Evidence**
- `allow create: if request.auth != null;` in chats rules.【F:firestore.rules†L75-L79】

**Risk**
- Unauthorized chat creation/spam.
- Potential social engineering vectors by creating fake chats with victims in participant lists.

**Recommendation**
- Require `request.auth.uid in request.resource.data.participants`.
- Enforce participant array size bounds and type constraints.
- Enforce immutable chat ID convention for DMs.

---

### 2) Firestore journey update rule permits broad mutation
**Issue**
Journey updates are allowed if the caller is a participant **or** the new participant list is a superset of old participants. The superset check can permit arbitrary document changes as long as old participants remain present.

**Evidence**
- Journey update condition includes `request.resource.data.participants.hasAll(resource.data.participants)` with no field-level restriction.【F:firestore.rules†L64-L69】

**Risk**
- Non-owner users can alter sensitive fields (owner metadata, status, preview fields, etc.) if they satisfy participant-list condition.

**Recommendation**
- Split update rules by action type (join request, approve/reject, owner edits).
- Restrict mutable keys per actor role using `diff(...).affectedKeys().hasOnly([...])`.
- Require owner/admin for structural journey fields.

---

### 3) Firestore comments create rule lacks identity/data validation
**Issue**
Any authenticated user can create any comment document without validation that `userId` equals auth UID.

**Evidence**
- `allow create: if request.auth != null;` for comments subcollection.【F:firestore.rules†L48-L53】

**Risk**
- User impersonation in comments.
- Injection of malformed/unbounded fields (payload inflation, moderation bypass).

**Recommendation**
- Require `request.resource.data.userId == request.auth.uid`.
- Validate allowed fields + constraints (length, createdAt type, no extra keys).

---

### 4) Public dream update rule allows untrusted counters
**Issue**
For public items, non-owners can update `likes`, `likesCount`, and `commentsCount`. This allows direct manipulation of aggregate counters.

**Evidence**
- Public dream update permits affected keys `['likes', 'likesCount', 'commentsCount']`.【F:firestore.rules†L30-L35】

**Risk**
- Like/comment counter inflation or desync by malicious clients.

**Recommendation**
- Non-owners should only mutate `likes` (or a safer reaction subcollection model).
- Keep counters server-maintained (Cloud Functions or trusted transactions).

---

### 5) RTDB messages writes do not enforce chat membership
**Issue**
RTDB rules allow any authenticated user to write under `/messages/{chatId}`. The validation checks sender ID but not whether the user belongs to that chat.

**Evidence**
- `.write": "auth != null"` at chat-level path.【F:database.rules.json†L3-L7】
- Message validation checks sender ID equals auth UID, but no participant membership check.【F:database.rules.json†L8-L10】

**Risk**
- Authenticated attacker can inject messages into arbitrary chats.

**Recommendation**
- Introduce server-maintained participant index in RTDB and enforce `.write` with membership checks.
- Or route all sends through callable/server path with access control.

---

## Medium Severity Findings

### 6) Chat notifications likely broken due to field mismatch
**Issue**
Cloud Function `onNewChatMessage` expects `message.userId`, but client writes `senderId` in message payload.

**Evidence**
- Function returns early unless `message.userId` exists and sets sender from it.【F:functions/src/triggers/chat.ts†L28-L31】
- Client plaintext builder uses `senderId` field.【F:src/services/chat.ts†L263-L271】
- RTDB validation requires `senderId` field, not `userId`.【F:database.rules.json†L8-L10】

**Risk**
- Push/in-app chat notifications silently fail for new messages.

**Recommendation**
- Standardize schema to `senderId` end-to-end.
- Add integration test for trigger payload shape.

---

### 7) Notification send path does not process Expo ticket receipts
**Issue**
Push send code posts messages but does not inspect response tickets/receipts to prune invalid tokens.

**Evidence**
- Raw POST to Expo push endpoint; no ticket handling logic afterward.【F:functions/src/utils/notifications.ts†L72-L83】

**Risk**
- Stale/invalid tokens accumulate, unnecessary retries, reduced delivery quality.

**Recommendation**
- Parse push tickets and periodically check receipts.
- Remove invalid/unregistered tokens from user docs.

---

## Code Quality Findings

### 8) Lint is failing with errors and substantial warning volume
**Issue**
Current lint run exits non-zero with 7 errors and 61 warnings.

**Evidence**
- `npm run lint` output reports failures (react/no-unescaped-entities and multiple hook/unused import warnings).

**Risk**
- Regressions and maintainability friction.

**Recommendation**
- Make lint clean a release gate.
- Prioritize fixing errors first, then warnings in batches (hooks deps, duplicate imports, dead vars).

---

## Positive Practices Observed
- TypeScript strict mode is enabled in app and functions tsconfig.【F:tsconfig.json†L3-L4】【F:functions/tsconfig.json†L8-L9】
- Storage rules constrain path ownership, MIME type, and upload size limits.【F:storage.rules†L7-L20】
- Encryption architecture includes per-user key derivation metadata and key verification flow on login.【F:src/services/keyManager.ts†L135-L173】

---

## Prioritized Remediation Plan
1. **Lock down Firestore/RTDB rules** (chats, journeys, comments, item counter mutation, RTDB membership).
2. **Fix chat payload schema mismatch** (`userId` vs `senderId`) and add regression tests.
3. **Harden notification infra** with Expo ticket/receipt handling and token cleanup.
4. **Drive lint to zero errors** and reduce warnings incrementally.
5. Add emulator security rule tests for critical paths (chat send, journey update, comment spoofing).
