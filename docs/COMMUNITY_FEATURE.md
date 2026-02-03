# Community Feature Documentation

## How Dreams Appear in the Community Tab

### Criteria for a Dream to Appear in Community Feed

For a dream to be visible in the Community tab for **other users**, it must meet the following criteria:

| Requirement | Description |
|-------------|-------------|
| **`isPublic: true`** | The "Share with Community" toggle must be **ON** when creating/editing the dream |
| **Firebase Rules** | Security rules must allow reading public items (see setup below) |
| **Authenticated User** | The viewer must be logged in to see the community feed |

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    USER A (Creator)                         │
├─────────────────────────────────────────────────────────────┤
│  1. Creates a dream                                         │
│  2. Toggles "Share with Community" → ON                     │
│  3. Dream saved with isPublic: true                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
            Saved to Firestore: items/{dreamId}
            Document contains: { isPublic: true, ... }
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    USER B (Viewer)                          │
├─────────────────────────────────────────────────────────────┤
│  1. Opens Community tab                                     │
│  2. App queries: where('isPublic', '==', true)              │
│  3. Firebase returns all public dreams                      │
│  4. Dreams displayed in feed                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Firebase Security Rules (REQUIRED)

> ⚠️ **You MUST update Firebase Security Rules for community features to work!**

### Steps to Update Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Replace with these rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Items (Dreams) Collection
    match /items/{itemId} {
      // Allow reading PUBLIC items by anyone authenticated
      // Allow reading OWN items (public or private)
      allow read: if request.auth != null && (
        resource.data.isPublic == true || 
        resource.data.userId == request.auth.uid
      );
      
      // Only owner can write
      allow create: if request.auth != null && 
                    request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                            resource.data.userId == request.auth.uid;
    }
    
    // Users Collection (for profiles - future)
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. Click **Publish**

---

## Troubleshooting

### Dream Not Showing in Community?

| Issue | Solution |
|-------|----------|
| Toggle not enabled | Edit the dream → Turn ON "Share with Community" |
| Firebase rules outdated | Update rules in Firebase Console (see above) |
| App cache | Pull-to-refresh in Community tab |
| New dream not synced | Wait a few seconds, then refresh |

### Check Console Logs

Look for these log messages to debug:
- `[CommunityService] Fetching public dreams...`
- `[CommunityService] Found X public dreams`
- Any errors will show in red

---

## Feature Summary

### What Users See

**My Dreams Tab:**
- All dreams (public and private) owned by current user

**Community Tab:**
- Only dreams where `isPublic === true`
- Dreams from ALL users (including own public dreams)
- Sorted by creation date (newest first)

### Filtering Options

Users can filter community dreams by:
- **Category** (Travel, Skills, Adventure, etc.)
- More filters coming in future updates

### Interactions

- **Like/Unlike**: Tap heart icon (toggles)
- **View Details**: Tap card to open dream detail
