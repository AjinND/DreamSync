# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DreamSync is a React Native (Expo) mobile app for collaborative bucket list and journey tracking. Users create "dreams" (bucket list items), track them through phases (dream → doing → done), share publicly, collaborate via "journeys," and chat in real time.

## Commands

```bash
npm start              # Start Expo dev server
npm run android        # Run on Android (requires emulator or device)
npm run ios            # Run on iOS (requires simulator or device)
npm run web            # Run web version
npm run lint           # ESLint (via expo lint)
```

No test runner is configured. After `npm install`, `patch-package` runs automatically via postinstall.

## Architecture

### Routing (Expo Router - file-based)

Routes live in `app/`. The root layout (`app/_layout.tsx`) handles auth state via Firebase `onAuthStateChanged` and redirects:
- Unauthenticated → `(auth)/login`
- Authenticated → `(tabs)/`

**Tab structure:** Home (`index`), Community, Journeys, Account. Dream management screens (`item/add`, `item/[id]`) use modal presentation.

### State Management (Zustand)

- `src/store/useBucketStore.ts` — personal dreams and journeys; provides optimistic updates and cross-syncs with community store when items are made public
- `src/store/useCommunityStore.ts` — public feed with stale-while-revalidate caching (30s), tag/category filtering, optimistic like/unlike
- `src/stores/useChatStore.ts` — chat room state

### Service Layer (`src/services/`)

All Firebase operations are isolated here. Each service handles one domain:
- `items.ts` — Dream CRUD, phase transitions, field-level encryption for private dreams
- `journeys.ts` — Collaboration: create journey, join/leave, participant management; group key distribution/rotation
- `community.ts` — Public feed, likes, filtering (always plaintext, only public items)
- `chat.ts` — E2E encrypted messages via Realtime Database, chat metadata via Firestore
- `comments.ts` — Comment CRUD
- `users.ts` — Profile creation/updates, encrypted profile fields
- `encryption.ts` — Core crypto primitives (PBKDF2, NaCl box/secretbox, field helpers)
- `keyManager.ts` — Key lifecycle (derivation, storage, publication, caching)
- `validation.ts` — Zod input validation schemas

**Journey Access Control:**
- **Read**: Journey dreams are publicly viewable (set `isPublic: true` and `collaborationType: 'group'`). Any authenticated user can browse/discover journey dreams before joining.
- **Write**: Only the owner and journey participants can update dream content. The `journeyParticipants` array is maintained by `journeys.ts` when participants join/leave. Participants can add progress, memories, reflections, etc., but cannot modify sensitive fields (userId, isPublic, collaborationType).

### Firebase Setup (`firebaseConfig.ts`)

- Auth: `initializeAuth` with AsyncStorage persistence on native, `getAuth` on web
- Firestore: `initializeFirestore` with `experimentalAutoDetectLongPolling` on Android (workaround), standard `getFirestore` elsewhere
- Realtime Database: used for chat messages (lower latency)
- Storage: image uploads
- Config sourced from `EXPO_PUBLIC_*` env vars in `.env`

**Security Rules:** Dreams associated with journeys are publicly viewable (for discoverability). Read access is granted via `isPublic: true` OR `collaborationType == 'group'/'open'`. Write access for participants is controlled via the `journeyParticipants` array, which is automatically maintained by `journeys.ts` when participants join/leave. Participants can update dream content but cannot modify ownership, visibility, or collaboration type.

### Component Organization (`src/components/`)

- `ui/` — Base atoms (Button, Card, Input, Avatar, Badge, etc.)
- `shared/` — Cross-domain utilities (EmptyState, LoadingState, Header, SearchBar, FilterChips)
- `dream/` — Dream-specific (DreamCard, DreamForm, detail modals for progress/expenses/memories/reflections/inspirations)
- `community/` — CommunityCard, TagChips
- `chat/` — MessageBubble, ChatInput, ChatListItem
- `social/` — CommentSection, UserAvatar
- `profile/` — ProfileHeader, ProfileDreamGrid

### Theme System (`src/theme/`)

Custom theme with light/dark mode support. Access via `useTheme()` hook which returns `{ colors, isDark, shadows }`. Colors defined in `colors.ts`, typography in `typography.ts`, spacing/shadows in `spacing.ts`.

### Styling

NativeWind (Tailwind CSS for React Native). Custom config in `tailwind.config.js`. Use `clsx` + `tailwind-merge` for conditional classes.

## Key Types (`src/types/`)

- `BucketItem` — Core dream type with phases, categories, sub-items (inspirations, reflections, memories, progress, expenses)
- `Journey` — Collaborative wrapper linking a dream to participants and chat
- `ChatMessage`, `ChatRoom` — Chat types
- `Comment`, `UserProfile` — Social types

## Conventions

- **TypeScript strict mode** is enabled
- **Path alias:** `@/*` maps to project root (e.g., `@/src/components/ui`)
- **Icons:** Lucide React Native preferred, Expo Vector Icons (Ionicons) also used
- **Screens go in `app/`**, business logic in `src/services/`, reusable UI in `src/components/`
- **Firestore security rules** in `firestore.rules` — update when changing DB access patterns. Journey-based access uses `journeyParticipants` array on dream documents.
- **No hardcoded secrets** — all Firebase config via `.env` with `EXPO_PUBLIC_` prefix

### Encryption & Data Privacy (`src/services/encryption.ts`, `keyManager.ts`)

**Key Derivation:** Password → PBKDF2-HMAC-SHA256 (100k iterations, @noble/hashes) → 32-byte master key → domain-separated SHA-256 derivation for chat keypair (X25519) and field encryption key.

**Field-Level Encryption:** Private dreams (`isPublic !== true`) encrypt sensitive fields (reflections, memories, expenses, progress, inspirations, location, budget) using NaCl `secretbox` (XSalsa20-Poly1305). Public dreams are always plaintext. Visibility transitions (public↔private) handle encrypt/decrypt automatically in `useBucketStore`.

**E2E Chat:**
- DM messages: NaCl `box` (X25519 + XSalsa20-Poly1305) between sender and recipient
- Group messages: NaCl `secretbox` with a per-chat symmetric group key, distributed to each participant via `box` encryption
- Group key rotation on participant departure (`journeys.ts._rotateGroupKey`)
- Legacy plaintext messages (`encrypted === undefined`) displayed as-is

**Key Storage:** `expo-secure-store` on native, `sessionStorage` on web. Master key cached in memory. Public keys cached per-session.

**Auth Flow:** Signup generates keys → Login re-derives from stored salt → Cold start with missing keys → Reauth screen (`(auth)/reauth.tsx`)

**Input Validation:** Zod schemas in `validation.ts` for auth, dreams, messages, profiles, expenses.

## Recent Changes

### Data Privacy & Encryption (2026-02-10)
- E2E encrypted chat (DM + group with key rotation)
- Field-level encryption for private dreams and user profiles
- PBKDF2 key derivation with password-based recovery
- Input validation via Zod at service boundaries
- Fixed security rules: RTDB message validation, comments require auth, storage path-based auth (no expiration)
- Reauth screen for encryption key recovery after reinstall

### Journey Access Control (2026-02-09)
Fixed insufficient permission error for journey participants viewing dreams. Journey-linked dreams are no longer public by default. Access is controlled via:
- `journeyParticipants` array field on dream documents (BucketItem type)
- Firestore security rules check this array for read access
- `journeys.ts` maintains this array on join/leave/accept operations
- New `leaveJourney()` method removes participants and revokes dream access
