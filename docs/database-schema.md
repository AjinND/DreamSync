# Database Schema Design
## DreamSync v2.0 - Firestore Collections

> **Last Updated:** 2026-02-02  
> **Database:** Cloud Firestore

---

## Overview

```
Firestore Collections
├── users/                    # User profiles
├── dreams/                   # All dreams (public + private)
│   └── likes/               # Subcollection: users who liked
│   └── comments/            # Subcollection: comments
├── journeys/                # Shared dreams (collaboration)
├── joinRequests/            # Pending join requests
├── chats/                   # Chat rooms (Metadata only)
│   └── (No subcollection - messages in RTDB)
├── notifications/           # In-app notifications
└── reports/                 # Content moderation
```

---

## Collection: `users`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Firebase UID (document ID) |
| `email` | string | ✅ | User email |
| `displayName` | string | ✅ | Display name |
| `username` | string | ✅ | Unique, URL-safe username |
| `avatarUrl` | string | ❌ | Profile picture URL |
| `bio` | string | ❌ | Short bio (max 150 chars) |
| `isVerified` | boolean | ✅ | Email/phone verified |
| `verificationLevel` | string | ✅ | `none` / `email` / `phone` / `id` |
| `stats.dreamsCount` | number | ✅ | Total dreams |
| `stats.completedCount` | number | ✅ | Completed dreams |
| `stats.sharedCount` | number | ✅ | Public dreams |
| `stats.journeysCount` | number | ✅ | Active journeys |
| `preferences.theme` | string | ✅ | `light` / `dark` / `system` |
| `preferences.notifications` | boolean | ✅ | Push enabled |
| `preferences.emailUpdates` | boolean | ✅ | Email digests |
| `createdAt` | timestamp | ✅ | Account creation |
| `updatedAt` | timestamp | ✅ | Last profile update |
| `lastActiveAt` | timestamp | ✅ | Last app activity |

**Indexes:**
- `username` (unique)
- `email` (unique)
- `createdAt` (for admin queries)

---

## Collection: `dreams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Auto-generated document ID |
| `userId` | string | ✅ | Owner's user ID |
| `title` | string | ✅ | Dream title (max 100 chars) |
| `description` | string | ❌ | Description (max 500 chars) |
| `category` | string | ✅ | Category enum |
| `status` | string | ✅ | `dream` / `doing` / `done` |
| `coverImage` | string | ❌ | Cover image URL |
| `targetDate` | timestamp | ❌ | Target completion date |
| `visibility` | string | ✅ | `private` / `public` |
| `interests` | array | ❌ | Tags for discovery |
| `likesCount` | number | ✅ | Cached like count |
| `commentsCount` | number | ✅ | Cached comment count |
| `joinRequestsCount` | number | ✅ | Pending requests |
| `isShared` | boolean | ✅ | Part of a journey |
| `journeyId` | string | ❌ | Link to journey |
| `createdAt` | timestamp | ✅ | Creation time |
| `updatedAt` | timestamp | ✅ | Last update |
| `completedAt` | timestamp | ❌ | Completion time |

**Categories Enum:**
```typescript
type Category = 
  | 'travel'
  | 'skill'
  | 'adventure'
  | 'career'
  | 'health'
  | 'relationship'
  | 'finance'
  | 'creative'
  | 'learning'
  | 'other';
```

**Indexes:**
- `userId + createdAt` (user's dreams)
- `visibility + createdAt` (public feed)
- `category + visibility` (filtered feed)
- `interests` (array-contains)

---

## Subcollection: `dreams/{dreamId}/likes`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | ✅ | User who liked (document ID) |
| `createdAt` | timestamp | ✅ | Like time |

---

## Subcollection: `dreams/{dreamId}/comments`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Auto-generated |
| `userId` | string | ✅ | Commenter's ID |
| `text` | string | ✅ | Comment text (max 500 chars) |
| `likesCount` | number | ✅ | Cached likes |
| `createdAt` | timestamp | ✅ | Creation time |
| `updatedAt` | timestamp | ✅ | Last edit |

---

## Collection: `journeys`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Auto-generated |
| `dreamId` | string | ✅ | Original dream |
| `ownerId` | string | ✅ | Dream owner |
| `members` | array | ✅ | All participant user IDs |
| `memberCount` | number | ✅ | Cached count |
| `chatId` | string | ✅ | Link to chat room |
| `status` | string | ✅ | `active` / `completed` / `archived` |
| `createdAt` | timestamp | ✅ | Creation time |
| `updatedAt` | timestamp | ✅ | Last activity |

**Member Details Map:**
```typescript
memberDetails: {
  [userId: string]: {
    role: 'owner' | 'member';
    joinedAt: number;
    status: 'active' | 'completed' | 'left';
  }
}
```

---

## Collection: `joinRequests`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Auto-generated |
| `dreamId` | string | ✅ | Target dream |
| `requesterId` | string | ✅ | Who wants to join |
| `ownerId` | string | ✅ | Dream owner |
| `message` | string | ❌ | Request message |
| `status` | string | ✅ | `pending` / `approved` / `declined` |
| `createdAt` | timestamp | ✅ | Request time |
| `respondedAt` | timestamp | ❌ | Response time |

**Indexes:**
- `ownerId + status` (owner's pending requests)
- `requesterId + status` (user's sent requests)

---

## Collection: `chats`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Auto-generated |
| `type` | string | ✅ | `journey` / `dm` |
| `journeyId` | string | ❌ | For journey chats |
| `participants` | array | ✅ | User IDs |
| `lastMessage.text` | string | ❌ | Preview text |
| `lastMessage.senderId` | string | ❌ | Who sent |
| `lastMessage.timestamp` | timestamp | ❌ | When sent |
| `createdAt` | timestamp | ✅ | Creation time |
| `updatedAt` | timestamp | ✅ | Last message time |

**Chat Type Logic:**
- 2 participants → 1-on-1 DM
- 3+ participants → Group chat

---

## Realtime Database: `/messages/{chatId}/{messageId}`
> **Note:** Messages are stored in Realtime DB for low latency and cost.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `senderId` | string | ✅ | Who sent |
| `text` | string | ✅ | Message content |
| `mediaUrl` | string | ❌ | Image/video URL |
| `mediaType` | string | ❌ | `image` / `video` |
| `reactions` | object | ❌ | `{ emoji: { userId: true } }` |
| `readBy` | object | ✅ | `{ userId: timestamp }` |
| `createdAt` | number | ✅ | Timestamp (ms) |

---

## Collection: `notifications`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Auto-generated |
| `userId` | string | ✅ | Recipient |
| `type` | string | ✅ | Notification type |
| `actorId` | string | ✅ | Who triggered |
| `dreamId` | string | ❌ | Related dream |
| `journeyId` | string | ❌ | Related journey |
| `read` | boolean | ✅ | Read status |
| `createdAt` | timestamp | ✅ | Creation time |

**Notification Types:**
```typescript
type NotificationType = 
  | 'like'
  | 'comment'
  | 'join_request'
  | 'request_approved'
  | 'request_declined'
  | 'new_message'
  | 'member_joined'
  | 'dream_completed';
```

---

## Collection: `reports`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Auto-generated |
| `reporterId` | string | ✅ | Who reported |
| `targetType` | string | ✅ | `user` / `dream` / `comment` / `message` |
| `targetId` | string | ✅ | Reported item ID |
| `reason` | string | ✅ | Report reason |
| `status` | string | ✅ | `pending` / `reviewed` / `resolved` |
| `createdAt` | timestamp | ✅ | Report time |
| `reviewedAt` | timestamp | ❌ | Review time |
| `reviewedBy` | string | ❌ | Admin ID |

---

## Security Rules Summary

| Collection | Read | Write |
|------------|------|-------|
| `users` | Authenticated | Own document only |
| `dreams` (private) | Owner only | Owner only |
| `dreams` (public) | Authenticated | Owner only |
| `journeys` | Members only | Owner + Members |
| `chats` | Participants | Participants |
| `notifications` | Recipient | System only |
| `reports` | Admin only | Authenticated |

---

## Denormalization Strategy

To avoid excessive reads:
1. Cache `likesCount`, `commentsCount` on dreams
2. Cache `memberCount` on journeys
3. Cache user `displayName`, `avatarUrl` in lastMessage
4. Use Cloud Functions to update counters

---

## Migration Notes

From v1 (`bucketItems` collection):
- Rename to `dreams`
- Add `visibility` (default: `private`)
- Add `likesCount`, `commentsCount` (default: 0)
- Map `phase` → `status` (`dream`/`doing`/`done`)
