Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 DreamSync Comprehensive Improvement Plan

 Context

 DreamSync is a production-ready React Native (Expo) bucket-list app with encrypted chat, community feed, and collaborative journeys. A full-stack audit
 has uncovered 3 critical security issues, 44 unguarded console statements, zero accessibility labels on interactive elements, structural inconsistencies
 (orphaned directories, split hook locations), and significant feature gaps (no tests, no onboarding, no toast feedback). This plan addresses everything in
  priority order without breaking existing functionality.

 ---
 Phase 1: Critical Security Fixes (IMMEDIATE)

 1.1 Restrict Firebase API Key

 - Action: Firebase Console > Project Settings > restrict API key to Android package name + iOS bundle ID
 - No code change — configuration only
 - Why: EXPO_PUBLIC_* vars are embedded in the JS bundle; key should be restricted even if "public"

 1.2 Fix Unencrypted Email Fallback

 - File: src/services/users.ts:192
 - Issue: If fieldKey is null, email is written plaintext to Firestore
 - Fix: Throw AppError when fieldKey is unavailable instead of silently skipping encryption
 - Also check: updateUserProfile() (~line 248) has the same conditional pattern

 1.3 Harden Web Key Storage (sessionStorage)

 - File: src/services/keyManager.ts:46-56
 - Issue: Master encryption key stored in sessionStorage — any XSS steals it
 - Short-term fix: Add __DEV__ warning + document as known web limitation
 - Long-term: Investigate Web Crypto API CryptoKey non-exportable objects (Phase 8)

 1.4 Guard All Console Statements in Services

 - Scope: 44 unguarded console.log/warn/error across 8 service files
 - Breakdown (unguarded count):
   - community.ts: 6 unguarded (11 already guarded)
   - comments.ts: 7 unguarded (7 already guarded)
   - journeys.ts: 14 unguarded (2 already guarded)
   - items.ts: 6 unguarded (0 guarded)
   - chat.ts: 5 unguarded (1 guarded)
   - notifications.ts: 4 unguarded
   - keyManager.ts: 1 unguarded
   - storage.ts: 1 unguarded
 - Fix: Wrap all with __DEV__ && prefix or replace with structured error handling

 1.5 Add Client-Side Rate Limiting to Mutation Operations

 - Existing util: src/utils/rateLimiter.ts (already has createCooldownLimiter)
 - New file: src/utils/operationLimiters.ts
   - likeLimiter (1s cooldown)
   - commentLimiter (3s cooldown)
   - reportLimiter (10s cooldown)
   - createDreamLimiter (5s cooldown)
 - Integrate into: community.ts (toggleLike, reportPost), comments.ts, items.ts (createItem)

 1.6 Add URL Sanitization to Validation Schemas

 - File: src/services/validation.ts:103
 - Issue: z.string().url() accepts javascript: and data: URIs
 - Fix: Add .refine() to only allow https?:// schemes
 - Affects: inspirationSchema, progressSchema, reflectionBlockSchema, messageSchema

 Verification

 - Firebase API key restricted in console; app still authenticates
 - npx tsc --noEmit passes
 - Profile email update without key throws error
 - All console statements guarded with __DEV__
 - Rapid-fire like tapping is throttled
 - javascript:alert(1) rejected as inspiration URL

 ---
 Phase 2: Project Structure Cleanup (HIGH)

 2.1 Delete Empty src/stores/ Directory

 - Confirmed empty — orphan artifact (actual stores in src/store/)

 2.2 Move Root hooks/ → src/hooks/

 - Files: use-color-scheme.ts, use-color-scheme.web.ts, use-theme-color.ts, useNotificationHandler.ts
 - Update imports across all files referencing hooks/
 - Delete empty src/hooks/ first, then move root hooks/ content in

 2.3 Move firebaseConfig.ts → src/config/firebaseConfig.ts

 - Currently imported from ../../firebaseConfig in 12+ service files
 - After move: import from @/config/firebaseConfig
 - CAUTION: Verify react-native-get-random-values polyfill import order is preserved

 2.4 Move src/components/loading/constants.ts → src/constants/loading.ts

 - Create src/constants/ directory
 - Update imports in BucketLoader*.tsx components

 2.5 Delete Legacy constants/theme.ts

 - Fully superseded by src/theme/ (colors.ts, typography.ts, spacing.ts)
 - Verify no remaining imports before deletion

 2.6 Add Missing Barrel Exports

 - Create: src/components/chat/index.ts — export all 5 chat components
 - Create: src/types/index.ts — re-export from item.ts, chat.ts, social.ts, notification.ts, encryption.ts

 Verification

 - npx tsc --noEmit passes after all moves
 - App starts and navigates on Android/iOS
 - No broken imports (grep for old paths)
 - src/stores/, root hooks/, root constants/ no longer exist

 ---
 Phase 3: Firestore Rules Hardening (HIGH)

 File: firestore.rules

 3.1 Add Timestamp Validation to Item Creates

 - Ensure createdAt is an integer on create rules

 3.2 Add Comment Minimum Length

 - Change text.size() > 0 to text.size() >= 2

 3.3 Restrict Collaborative Update Fields

 - Add isPublic and phase to participantAllowedItemFieldsOnly() blocked list
 - Only the dream owner should change visibility or completion phase

 3.4 Add Reports Collection Rule

 - CommunityService.reportPost() writes to reports collection — needs explicit rule
 - Allow create for authenticated users with required fields; deny all reads (admin only)

 3.5 Reduce Chat Participant Limit

 - Current: participants.size() <= 50 — reduce to <= 20 (more reasonable)

 Verification

 - firebase deploy --only firestore:rules
 - Dream creation, like, comment, report all still work
 - Journey participants cannot modify isPublic or phase

 ---
 Phase 4: UI/UX Quick Wins (MEDIUM) Completed

 4.1 Add Toast/Snackbar Notification System

 - Build src/components/ui/Toast.tsx or install react-native-toast-message
 - Create src/providers/ToastProvider.tsx
 - Integrate into: like toggle, comment post, dream create, report submit, block user, profile save, error states

 4.2 Add Consistent Skeleton Screens

 - New: src/components/dream/DreamCardSkeleton.tsx
 - New: src/components/community/CommunityCardSkeleton.tsx
 - New: src/components/profile/ProfileHeaderSkeleton.tsx
 - Replace BucketLoader spinners in home, community, and profile initial loads

 4.3 Add Core Accessibility Labels

 - 0 accessibility labels exist on interactive components currently
 - Priority targets:
   - src/components/ui/Button.tsx — default accessibilityRole="button", derive label from text
   - src/components/ui/IconButton.tsx — mandatory accessibilityLabel (no text to derive from)
   - src/components/ui/AnimatedPressable.tsx — pass-through a11y props
   - Like/comment/share action buttons on dream cards
   - Tab bar icons
   - Navigation back buttons

 4.4 Add Swipe-to-Delete for Dream Items

 - Use react-native-gesture-handler Swipeable (already installed)
 - Wrap DreamCard on home tab only (not community)
 - Red "Delete" action on right swipe with haptic + confirmation alert

 Verification

 - Toasts appear on like, comment, create, report, block, save, errors
 - Skeletons show during initial load on home, community, profile
 - VoiceOver/TalkBack can navigate and activate all buttons
 - Swipe-to-delete works on home tab with confirmation

 ---
 Phase 5: Code Quality & Error Handling (MEDIUM)

 5.1 Fix Unlike Promise.allSettled Silent Failures

 - File: src/services/community.ts:345
 - Check allSettled results; log partial failures in __DEV__
 - Consider using runTransaction for atomicity (long-term)

 5.2 Add Pagination to Subcollection Queries

 - File: src/services/items.ts — getInspirations, getMemories, getReflections, getProgress, getExpenses
 - Add limit(50) to getDocs() queries to prevent unbounded reads

 5.3 Sanitize Error Messages

 - File: src/utils/AppError.ts
 - Ensure toAppError() never leaks Firebase document paths or internal IDs in user-facing messages
 - Strip sensitive details before creating user messages

 5.4 Document Encryption Decisions

 - New file: docs/ENCRYPTION_DECISIONS.md
 - Document KDF iteration count (10k), rationale, OWASP comparison, future plans
 - Add security notes to keyManager.ts about password memory handling

 Verification

 - Unlike partial failures visible in dev console
 - Subcollection queries capped at 50 docs
 - No Firebase paths visible in user-facing error messages

 ---
 Phase 6: Testing Foundation (MEDIUM-HIGH)

 6.1 Set Up Testing Infrastructure

 - Install: jest, @testing-library/react-native, jest-expo, @types/jest
 - Create jest.config.js with Expo preset
 - Create __mocks__/ for Firebase, SecureStore, tweetnacl, @noble/hashes
 - Add "test" and "test:coverage" scripts to package.json

 6.2 Unit Tests — Critical Services (target 80% coverage)

 1. src/services/encryption.ts — encrypt/decrypt roundtrips, edge cases
 2. src/services/validation.ts — all schemas with valid/invalid inputs
 3. src/utils/rateLimiter.ts — cooldown + backoff behavior
 4. src/utils/AppError.ts — conversion, detection, message extraction

 6.3 Integration Tests — Store Logic

 - src/store/useBucketStore.ts — optimistic updates, search, pagination
 - src/store/useCommunityStore.ts — filtering, like state management
 - Mock service layer entirely

 Verification

 - npm test runs successfully
 - 80%+ coverage on encryption, validation, rateLimiter, AppError
 - Tests added to CI workflow

 ---
 Phase 7: Feature Improvements (LOW-MEDIUM)

 7.1 Data Export (CSV/JSON)

 - New: src/services/dataExport.ts
 - Fetch all user items (paginated, decrypted), format as JSON/CSV
 - Use expo-sharing to share file
 - Add "Export My Data" in settings

 7.2 Analytics/Crash Reporting

 - Install @sentry/react-native (partially prepared — see tech debt)
 - Initialize in app/_layout.tsx
 - Replace production console.error with Sentry.captureException()

 7.3 Notification Grouping

 - Modify Cloud Functions to check for existing unread notification on same dream
 - Update to "User1 and 3 others liked your dream" pattern

 7.4 Onboarding Flow

 - New: app/(auth)/onboarding.tsx — 3-4 swipeable screens
 - Store completion in AsyncStorage
 - Show only after first signup

 ---
 Phase 8: Long-Term Architecture (LOW)

 8.1 Offline Write Queue

 - Intercept writes when offline → store in AsyncStorage → replay on reconnect
 - Show sync indicator in UI

 8.2 Internationalization (i18n)

 - Install i18next + react-i18next + expo-localization
 - Extract all user-facing strings incrementally

 8.3 Content Moderation Pipeline

 - Auto-flag content via Cloud Functions
 - Admin dashboard for report review

 8.4 Web Crypto Non-Exportable Keys

 - Refactor keyManager.ts to use CryptoKey objects on web instead of sessionStorage strings
 - Eliminates XSS key theft vector

 ---
 Priority Execution Order

 Phase 1 (Security)  →  Phase 3 (Rules)  →  Phase 2 (Structure)
                                           →  Phase 6 (Tests)
                                           →  Phase 4 (UI/UX)
                                           →  Phase 5 (Quality)
                                              →  Phase 7 (Features)
                                                 →  Phase 8 (Architecture)

 Key Dependencies

 - Phase 1.6 (URL validation) should complete before Phase 6.2 (validation tests)
 - Phase 1.4 (console cleanup) should complete before Phase 7.2 (Sentry replaces console.error)
 - Phase 1.5 (rate limiting) pairs with Phase 4.1 (toast shows rate limit message)
 - Phase 6.1 (test infra) blocks Phase 6.2 and 6.3

 Risk Mitigations

 ┌────────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
 │                      Risk                      │                      Mitigation                      │
 ├────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ Moving firebaseConfig.ts breaks polyfill order │ Move polyfill import to _layout.tsx entry point      │
 ├────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ Firestore rule changes break client            │ Test in emulator first; deploy off-peak              │
 ├────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ Rate limiting annoys fast users                │ Use generous limits + friendly toast messages        │
 ├────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ URL sanitization rejects stored data           │ Only applies to new writes; existing data unaffected │
 └────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

 Claude has written up a plan and is ready to execute. Would you like to proceed?

\Users\ajind\.claude\plans\playful-finding-tome.md