# LivingList Feature Audit and Implementation Plan

## Decisions Locked
- Reflections support rich content blocks (`text`, `image`, `link`).
- Journey "public" means community discoverability, not automatic join.
- Profile encryption scope focuses on PII; public profile fields remain readable.

## Implemented in This Change

### 1. Backend enforcement for visibility and comments
- Added Firestore rule helpers:
  - `isCommunityVisibleItem(data)` enforces that community-visible content must be `isPublic == true` and `phase in ['doing','done']`.
  - `canBePublicByPhase(data)` prevents sharing while in `dream` phase.
  - `participantAllowedItemFieldsOnly()` tightens participant update boundaries.
- Updated `items` rules:
  - Create/update now enforce public-phase coupling.
  - Like toggles only apply to community-visible dreams.
- Updated comment create rule:
  - Comments can only be created for community-visible dreams.

### 2. Inspired copy behavior corrected
- "Get Inspired" now copies only the intended seed data:
  - title
  - description
  - category
- Removed copying of images for inspired dreams.

### 3. Reflection model upgraded to rich content
- Extended reflection data model with `contentBlocks`:
  - `ReflectionBlock = { type: 'text' | 'image' | 'link'; value: string; caption?: string }`
- Preserved legacy compatibility:
  - Existing `question` / `answer` fields remain optional and renderable.
- Updated reflection add flow:
  - New modal now captures text, optional image URL, optional link + link title.
- Updated reflection rendering:
  - Supports text rendering, image block rendering, and link block rendering.

### 4. Reflection encryption/sanitization support
- Updated private dream encryption/decryption for reflection blocks:
  - encrypt/decrypt `contentBlocks[].value`
  - encrypt/decrypt `contentBlocks[].caption`
- Updated community sanitization for reflection blocks:
  - encrypted values are blanked from public payload.

### 5. Progress/expense editing aligned to in-progress phase
- Add actions are now restricted to `doing` phase:
  - Progress add button only shown in `doing`.
  - Expense add button only shown in `doing`.
- Existing content remains viewable for historical context.

### 6. Profile visibility enforcement
- `UsersService.getUserProfile` now respects `settings.privacy.isPublicProfile` for non-owners.
- Non-owners never receive profile email from service responses.
- `UsersService.getUserPublicDreams` now:
  - returns empty when target profile is private (for non-owners),
  - filters out completed dreams when `showCompletedDreams` is disabled.

## Remaining Work (Follow-up)
- Add schema validation for reflection block inputs (URLs and length constraints).
- Add explicit journey badge rendering consistency across all list/detail surfaces.
- Add emulator tests for the new Firestore rule branches (allow/deny matrix).
- Reconcile settings write typing in privacy/appearance screens to remove `as any`.

## Acceptance Checklist
- Public toggle blocked for `dream` phase at both UI and Firestore rule level.
- Non-owner cannot comment on non-community-visible dreams.
- Inspired copy no longer clones media fields.
- Reflection entries can include text/image/link blocks and display correctly.
- Private reflection block values are encrypted at rest.
- Progress and expense add actions are available only during `doing`.
- Private profiles are not viewable by other users.
