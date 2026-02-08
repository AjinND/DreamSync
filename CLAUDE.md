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
- `items.ts` — Dream CRUD, phase transitions
- `journeys.ts` — Collaboration: create journey, join requests, participant management; auto-creates chat
- `community.ts` — Public feed, likes, filtering
- `chat.ts` — Messages via Realtime Database, chat metadata via Firestore
- `comments.ts` — Comment CRUD
- `users.ts` — Profile creation/updates, `ensureUserProfile()` called on auth

### Firebase Setup (`firebaseConfig.ts`)

- Auth: `initializeAuth` with AsyncStorage persistence on native, `getAuth` on web
- Firestore: `initializeFirestore` with `experimentalAutoDetectLongPolling` on Android (workaround), standard `getFirestore` elsewhere
- Realtime Database: used for chat messages (lower latency)
- Storage: image uploads
- Config sourced from `EXPO_PUBLIC_*` env vars in `.env`

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
- **Firestore security rules** in `firestore.rules` — update when changing DB access patterns
- **No hardcoded secrets** — all Firebase config via `.env` with `EXPO_PUBLIC_` prefix
