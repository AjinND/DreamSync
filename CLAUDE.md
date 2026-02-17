# CLAUDE.md

## Project Overview
DreamSync is an Expo Router React Native app for personal and collaborative bucket-list tracking. Core domains are dreams/items, community feed, journeys, encrypted chat, and notifications.

## Commands
```bash
npm start
npm run android
npm run ios
npm run web
npm run lint
npx tsc --noEmit

cd functions && npm run build
cd functions && npm run serve
cd functions && npm run deploy

firebase deploy --only firestore:rules
firebase deploy --only storage
```

## Routing
- `app/(auth)`: `login`, `signup`, `verify-email`, `reauth`
- `app/(tabs)`: `index`, `community`, `journeys`, `account`
- Item and social routes: `app/item/[id].tsx`, `app/profile/[id].tsx`, `app/chat/*`
- Deep links:
  - `dreamsync://dream/{id}` -> `app/dream/[id].tsx` -> item detail
  - `dreamsync://journey/{id}` -> `app/journey/[id].tsx` -> item detail

## State Management (Zustand)
- `src/store/useBucketStore.ts`: items, pagination, optimistic updates, search
- `src/store/useCommunityStore.ts`: community feed, pagination, category/tag filters, optimistic likes
- `src/store/useChatStore.ts`: chat list/messages, send pipeline, pending messages
- `src/store/useNotificationStore.ts`: unread counts and notification state

## Services
- `src/services/items.ts`: item CRUD + encryption policy + paginated fetch
- `src/services/community.ts`: public feed, likes (normalized + legacy compat), reports, block list cache
- `src/services/journeys.ts`: journey lifecycle, pagination, participant/key rotation
- `src/services/chat.ts`: RTDB messages + Firestore metadata + encryption
- `src/services/comments.ts`: comment CRUD + authorization checks
- `src/services/users.ts`: profile + private settings split (`users/{uid}/private/*`)
- `src/services/notifications.ts`: push token registration/storage + read status updates
- `src/services/storage.ts`: deterministic storage paths + media cleanup/migration helpers
- `src/services/imageOptimizer.ts`: validation + optimization pipeline
- `src/services/accountDeletion.ts`: end-to-end account deletion cleanup flow
- `src/services/keyManager.ts`: key lifecycle and secure local storage
- `src/services/encryption.ts`: cryptographic primitives and field/chat encryption helpers

## Firestore Data Patterns
- Public user data: `users/{uid}` (display fields + public keys)
- Private user data:
  - `users/{uid}/private/keys`
  - `users/{uid}/private/settings`
- Likes normalization:
  - `items/{dreamId}/likes/{userId}` — subcollection (current)
  - `items/{dreamId}.likesCount` — denormalized count
  - `items/{dreamId}.likes[]` — legacy array still read for compat during migration
- Sub-items stored as subcollections: `items/{id}/inspirations`, `/memories`, `/reflections`, `/progress`, `/expenses`

## Encryption Architecture
- Key derivation: PBKDF2-HMAC-SHA256 via Web Crypto API (primary, async, native engine) with `@noble/hashes` as pure-JS fallback
- `KDF_ITERATIONS = 10_000` for new signups (previously 100k — existing users migrated down on first login)
- Master key → chat keypair (`deriveChatKeyPair`) + field key (`deriveFieldEncryptionKey`) via SHA-256 domain separation
- Public dreams: story fields (inspirations, memories, reflections) stored **unencrypted** — private dreams encrypt these with owner's field key
- Always encrypted regardless of visibility: `location`, `budget`, `expenses`, `progress`
- Chat encrypted with group key (journey) or per-message asymmetric encryption (DM)

## Cloud Functions
- Existing triggers:
  - `onDreamLiked`, `onNewComment`
  - `onJourneyUpdate`
  - `onNewChatMessage`, `syncChatParticipants`
  - `checkDueDateReminders`
- Migration + cleanup:
  - `migrateSubItems` (callable)
  - `migrateLikes` (callable)
  - `onUserDeletedCleanup` (auth trigger)

## Firestore Rules — Key Decisions
- `items/{itemId}` update: `canToggleOwnLikeOnly()` allows `['likes', 'likesCount']` together (not just `['likes']`)
- `items/{itemId}/likes/{likeUserId}`: users can create/update their own like doc on community-visible items; delete their own like anytime
- `items/{itemId}/inspirations|memories|reflections`: readable by all for community-visible items (`canReadItemForSubcollections`)
- Comment delete: dream owner OR comment author can delete (`get(items/{itemId}).data.userId == request.auth.uid`)

## Error System
- `src/utils/AppError.ts` provides:
  - `AppError`
  - `ErrorCode`
  - `toAppError`, `isAppError`, `getUserMessage`
- Services throw normalized errors; stores render user-safe messages.

## Hooks
- Local hooks are screen/component-level (`useEffect`, `useFocusEffect`).
- Notification listener hook: `hooks/useNotificationHandler`.

## New Screens
- `app/settings/delete-account.tsx`
- `app/(auth)/verify-email.tsx`
- Deep-link adapters:
  - `app/dream/[id].tsx`
  - `app/journey/[id].tsx`

## Modal Pattern (AddInspirationModal, AddMemoryModal, AddReflectionModal)
- `KeyboardAvoidingView behavior="padding"` (both platforms) — avoids touch target clipping on Android
- `keyboardView` style: `flex: 1, justifyContent: 'flex-end'`
- `ScrollView keyboardShouldPersistTaps="handled"` wraps form fields only
- Action buttons live **outside** ScrollView — always pinned to bottom, always tappable
- `paddingBottom: Math.max(24, insets.bottom + 12)` on container for safe area
- `presentationStyle="overFullScreen"` + `statusBarTranslucent` + `onRequestClose` on Modal

## Conventions
- TypeScript strict mode
- Alias imports via `@/*`
- Keep Firebase rules/functions aligned with data model changes
- Keep sensitive data in private user subcollection
- Use `serverTimestamp()` for server-authored metadata fields
- After any `firestore.rules` change: deploy with `firebase deploy --only firestore:rules`

## Known Limitations / Tech Debt
- Sub-items full migration to subcollections is partially prepared (migration callable added) and still needs complete client/runtime transition.
- Offline queued-write indicator is still connectivity-based UI; deeper pending-write metadata UX remains.
- Sentry native package integration is optional at runtime and not fully installed/configured in dependencies yet.
- App Check full native providers (Play Integrity/App Attest) are not fully wired in client runtime.
- Automated tests are not yet present; CI currently runs lint/typecheck/build only.
- Unlike operation uses `Promise.allSettled` — does not propagate errors to the community store's catch block.

## Recent Changes (2026-02-17)
- Added account deletion service + delete-account settings screen.
- Added email verification flow (`signup` send + `verify-email` screen + banner/redirect handling).
- Added paginated community, journeys, and personal items flows with infinite scroll.
- Added home/community search experience and client-side rate limiting utilities.
- Added deep-link adapter routes (`dream/{id}`, `journey/{id}`) and share-link updates.
- Added Cloud Functions for sub-item migration, likes migration, and auth delete cleanup.
- Added CI workflow and EAS channel configuration updates.
- Fixed login encryption delay: `deriveKeyFromPassword` now async using Web Crypto API; `KDF_ITERATIONS` reduced 100k→10k; one-time migration on login for existing users.
- Fixed inspirations always empty in community view: removed `orderBy('date')` from `getInspirations` (Inspiration type has no `date` field — Firestore silently returned 0 docs).
- Fixed like permission denied: `canToggleOwnLikeOnly` now allows `['likes', 'likesCount']`; added `items/{id}/likes/{uid}` subcollection rule.
- Fixed dream owner unable to delete others' comments: `CommentSection` now accepts `isDreamOwner` prop; delete button shown for owner or comment author.
- Fixed modal buttons unclickable: all 3 add-content modals (`AddInspirationModal`, `AddMemoryModal`, `AddReflectionModal`) use `behavior="padding"` + `ScrollView` + safe area insets.
