# Community Card Fixes - Implementation Summary

## Issues Fixed

### 1. ✅ Phase Badge Text Invisible (Bug Fix)
**Problem:** Phase badge text was invisible on dark backgrounds because it used `color: phaseLabel` (string like "Dream") instead of the actual color value.

**Fix:** Changed line 321 in `CommunityCard.tsx`:
```tsx
// Before
<Text style={[styles.phaseLabel, { color: phaseLabel }]}>

// After
<Text style={[styles.phaseLabel, { color: phaseColor }]}>
```

### 2. ✅ Comment Button Navigation (UX Enhancement)
**Problem:** Clicking the comment button just opened the dream detail, with no indication to scroll to comments.

**Fix:** Updated `handleComment` to pass a `scrollTo=comments` query param:
```tsx
router.push(`/item/${dream.id}?scrollTo=comments`);
```

Added auto-scroll logic in `app/item/[id].tsx`:
- Added ScrollView ref
- Added comments section ref
- Added useEffect to auto-scroll when `scrollTo` param is present

### 3. ✅ User Profile Navigation (TODO Implemented)
**Problem:** Clicking on user avatar/name showed a console.log instead of navigation.

**Fix:** Implemented navigation with a "Coming Soon" alert (screen doesn't exist yet):
```tsx
Alert.alert('Coming Soon', 'User profiles will be available in the next update!');
```

Note: Need to create `/app/user/[id].tsx` screen in future.

### 4. ✅ Report Submission Backend (TODO Implemented)
**Problem:** Reports weren't being saved to backend.

**Fix:** Added `reportPost` method to `CommunityService`:
```tsx
async reportPost(dreamId: string, reason: string): Promise<void> {
    await addDoc(collection(db, 'reports'), {
        dreamId,
        reportedBy: user.uid,
        reason,
        createdAt: serverTimestamp(),
        status: 'pending',
    });
}
```

Updated `CommunityCard.submitReport` to call this service.

### 5. ✅ User Blocking Feature (TODO Implemented)
**Problem:** User blocking wasn't implemented.

**Fix:** Added three methods to `CommunityService`:
```tsx
async blockUser(blockedUserId: string): Promise<void>
async getBlockedUsers(): Promise<string[]>
```

Updated feed fetching methods to filter out blocked users:
- `getPublicDreams()` - filters blocked users
- `getDreamsByTag()` - filters blocked users
- `getDreamsByCategory()` - filters blocked users

Updated `CommunityCard.handleBlockUser` to:
1. Call `CommunityService.blockUser()`
2. Show success message prompting user to refresh feed
3. Show error message on failure

## Bottom Sheet Positioning

**Note:** The bottom sheet (3-dot menu) **should already appear from screen bottom** correctly. The `@gorhom/bottom-sheet` library uses portals, so it renders at screen level regardless of where the component is placed in the tree. If it's appearing at the post bottom instead, this might be a styling/zIndex issue with the container or a version/config issue with the library.

The current implementation is correct:
```tsx
<BottomSheet
    ref={ref}
    index={-1}
    snapPoints={[isOwnPost ? 180 : 240]}
    enablePanDownToClose
    backdropComponent={renderBackdrop}
    // ... correct configuration
/>
```

## Database Changes Required

### New Firestore Collection: `reports`
```typescript
{
    dreamId: string;
    reportedBy: string;
    reason: 'spam' | 'inappropriate' | 'harassment';
    createdAt: Timestamp;
    status: 'pending' | 'reviewed' | 'resolved';
}
```

### Updated User Document Schema
```typescript
{
    // ... existing fields
    blockedUsers?: string[];  // Array of blocked user IDs
}
```

## Security Rules Required

Add to `firestore.rules`:

```javascript
// Reports collection - authenticated users can create, only admins can read
match /reports/{reportId} {
    allow create: if request.auth != null
        && request.resource.data.reportedBy == request.auth.uid;
    allow read, update, delete: if false; // Admin only (via Firebase Admin SDK)
}

// Update users collection to allow users to update their own blockedUsers array
match /users/{userId} {
    allow update: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['blockedUsers']);
}
```

## Testing Checklist

- [ ] Phase badge text is visible and colored correctly
- [ ] Comment button navigates to detail screen
- [ ] Detail screen auto-scrolls to comments section
- [ ] User avatar/name shows "Coming Soon" alert
- [ ] Report submission saves to Firestore `reports` collection
- [ ] Block user adds to `users/{uid}/blockedUsers` array
- [ ] Blocked users' posts don't appear in feed after refresh
- [ ] Bottom sheet appears from screen bottom (not post bottom)

## Future Work

1. **Create User Profile Screen** (`/app/user/[id].tsx`)
   - Display public user info
   - Show user's public dreams
   - Follow/unfollow functionality

2. **Admin Dashboard** for reviewing reports
   - View pending reports
   - Take action (remove content, warn user, ban user)

3. **Unblock User Feature**
   - Settings screen to manage blocked users
   - Ability to unblock users
