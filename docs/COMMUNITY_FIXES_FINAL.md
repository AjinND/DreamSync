# Community Tab - Final Fixes Summary

## Issues Fixed

### 1. ✅ User Profile Navigation Route
**Problem:** Navigation was using `/user/[id]` but the actual route is `/profile/[id]`.

**Fix:** Updated `CommunityCard.tsx` line 122:
```tsx
router.push(`/profile/${dream.userId}` as any);
```

**Verification:** Click on user avatar/name in community feed → should navigate to their public profile.

---

### 2. ✅ Missing User Names (showing "Anonymous")
**Problem:** Legacy public posts don't have the `sharedBy` field populated, causing "Anonymous" to display.

**Root Cause:** The `sharedBy` field is only set when sharing via the ShareDreamModal (in `app/item/[id].tsx`). Older posts or posts made public through other means don't have this field.

**Fix:** Added `enrichWithUserData()` function in `community.ts` that:
1. Identifies dreams missing `sharedBy`
2. Fetches user profiles for those dreams
3. Populates `sharedBy` with user data from Firestore `users` collection

**Code Changes:**
- Added imports: `UsersService`, `writeBatch`
- Added `enrichWithUserData()` helper function
- Updated `getPublicDreams()`, `getDreamsByTag()`, `getDreamsByCategory()` to call enrichment

**Verification:** Refresh community feed → all posts should show correct user names and avatars.

---

### 3. ✅ Bottom Sheet Positioning (appears at screen bottom)
**Problem:** Bottom sheet was appearing relative to the post instead of sliding up from the screen bottom.

**Root Cause:** Using `BottomSheet` (non-modal) inside FlatList items with `removeClippedSubviews={true}` can cause portal rendering issues.

**Fix:** Migrated to `BottomSheetModal` with `BottomSheetModalProvider`:

**Files Changed:**

1. **`app/_layout.tsx`:**
   - Added `BottomSheetModalProvider` import
   - Wrapped Stack in `<BottomSheetModalProvider>`
   - Also wrapped loading screen for consistency

2. **`src/components/community/CommunityPostActionMenu.tsx`:**
   - Changed from `BottomSheet` to `BottomSheetModal`
   - Changed `close()` to `dismiss()`
   - Added `enableDismissOnClose` prop
   - Changed `index={-1}` to `index={0}` (modal uses different indexing)

3. **`src/components/community/CommunityCard.tsx`:**
   - Changed import from `BottomSheet` to `BottomSheetModal`
   - Changed ref type to `BottomSheetModal`
   - Changed `snapToIndex(0)` to `present()`

**Verification:**
- Click 3-dot menu on any post
- Bottom sheet should slide up from screen bottom
- Backdrop should appear behind it
- Can dismiss by swiping down or tapping backdrop

---

### 4. ⚠️ Report Alert Backdrop Dismissal (Native Behavior)
**Status:** Working as designed (no change needed)

**Explanation:** The Report dialog uses React Native's native `Alert.alert()`, which is standard iOS/Android behavior. Native alerts **do not** dismiss when clicking outside - this is intentional for UX safety (prevents accidental dismissal).

**Current Behavior:**
- 3 report reason buttons (Spam, Inappropriate, Harassment)
- 1 Cancel button at bottom

**Alternative (if needed in future):** Replace `Alert.alert` with a custom bottom sheet for backdrop dismissal.

---

## Testing Checklist

### User Profile Navigation
- [ ] Click user avatar in community feed → navigates to `/profile/[userId]`
- [ ] Click user name in community feed → navigates to `/profile/[userId]`
- [ ] Profile screen loads correctly with user info

### User Names Display
- [ ] All posts show correct user displayName (no "Anonymous" for real users)
- [ ] Avatar images display correctly
- [ ] Fallback to first letter avatar works when no photoURL

### Bottom Sheet Positioning
- [ ] 3-dot menu slides up from screen bottom (not post bottom)
- [ ] Backdrop appears correctly
- [ ] Can swipe down to dismiss
- [ ] Can tap backdrop to dismiss
- [ ] Share button works
- [ ] Report button shows native alert
- [ ] Block button shows confirmation dialog
- [ ] Bottom sheet appears above other content (proper z-index)

### Report Functionality
- [ ] Click Report → native alert appears
- [ ] Select a reason → report submitted to Firestore
- [ ] Success message appears
- [ ] Cancel button dismisses alert
- [ ] Report saved to `reports` collection

### Block Functionality
- [ ] Click Block User → confirmation alert
- [ ] Confirm → user added to `blockedUsers` array
- [ ] Success message prompts to refresh
- [ ] After refresh, blocked user's posts don't appear

---

## Database Schema

### `reports` Collection
```typescript
{
    dreamId: string;
    reportedBy: string;
    reason: 'spam' | 'inappropriate' | 'harassment';
    createdAt: Timestamp;
    status: 'pending';
}
```

### `users/{userId}` Document
```typescript
{
    // ... existing fields
    blockedUsers?: string[];  // Array of blocked user IDs
}
```

---

## Known Limitations

1. **User data enrichment is client-side:** The `enrichWithUserData()` function fetches user profiles on the client. For very large feeds, this could add latency. Future optimization: denormalize `sharedBy` at write time via Cloud Functions.

2. **Blocked users require refresh:** When blocking a user, the user must manually refresh the feed to see the filter applied. Future improvement: immediately filter from local state.

3. **Native Alert doesn't dismiss on backdrop:** This is by design for native alerts. If custom UX is needed, replace with bottom sheet.

---

## Future Enhancements

1. **Migrate sharedBy to Cloud Function:** Automatically populate `sharedBy` when `isPublic` is set to `true` via Firestore trigger.

2. **Real-time block updates:** Use Zustand to immediately filter blocked users from feed without refresh.

3. **Replace Report Alert with Bottom Sheet:** For consistent UX with custom styling and backdrop dismiss.

4. **Cache user profiles:** Cache fetched user profiles in memory to avoid repeated fetches.
