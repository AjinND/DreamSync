# Architecture Document v2.0
## DreamSync - Social Bucket List Platform

> **Version:** 2.0  
> **Last Updated:** 2026-02-02

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         DreamSync                                │
├─────────────────────────────────────────────────────────────────┤
│  React Native (Expo)    │   Firebase Services                   │
│  ├── Expo Router        │   ├── Authentication                  │
│  ├── Zustand (State)    │   ├── Firestore (Primary DB)          │
│  ├── Reanimated         │   ├── Realtime DB (Chat)              │
│  └── Custom Design Sys  │   ├── Cloud Storage                   │
│                         │   └── Cloud Functions                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Navigation Architecture

```
Root Stack
├── (auth)                    # Auth flow (unauthenticated)
│   ├── login
│   ├── register
│   └── verify                # Email/phone verification
│
├── (tabs)                    # Main app (authenticated)
│   ├── home/                 # Home tab
│   │   ├── index            # Dashboard + Dream list
│   │   └── [category]       # Category filter view
│   │
│   ├── community/           # Community tab
│   │   ├── index            # Public feed
│   │   ├── [interest]       # Interest-based view
│   │   └── user/[id]        # Public profile
│   │
│   ├── journeys/            # Journeys tab (shared dreams)
│   │   ├── index            # My shared journeys
│   │   ├── [dreamId]        # Journey detail
│   │   └── requests         # Join requests
│   │
│   └── account/             # Account tab
│       ├── index            # Profile & settings
│       ├── edit             # Edit profile
│       └── badges           # Achievements
│
├── dream/
│   ├── add                  # Create dream (modal)
│   ├── [id]                 # Dream detail (modal)
│   └── [id]/edit            # Edit dream (modal)
│
├── chat/
│   ├── index               # Chat list
│   ├── [dreamId]           # Group chat
│   └── dm/[userId]         # Direct message
│
└── +not-found
```

---

## 3. Database Schema (Firestore)

### Collections

#### `users`
```typescript
interface User {
  id: string;                  // Firebase UID
  email: string;
  displayName: string;
  username: string;            // Unique, URL-safe
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;         // Email/phone verified
  verificationBadge?: 'none' | 'email' | 'phone' | 'id';
  stats: {
    dreamsCount: number;
    completedCount: number;
    sharedCount: number;
    journeysCount: number;
  };
  createdAt: number;
  lastActiveAt: number;
}
```

#### `dreams`
```typescript
interface Dream {
  id: string;
  userId: string;              // Owner
  title: string;
  description?: string;
  category: Category;
  status: 'dream' | 'doing' | 'done';
  coverImage?: string;
  targetDate?: number;
  
  // Privacy & Social
  visibility: 'private' | 'public' | 'interest-based';
  interests: string[];         // Tags for discovery
  
  // Engagement
  likesCount: number;
  commentsCount: number;
  joinRequestsCount: number;
  
  // Collaboration
  isShared: boolean;           // Part of a Journey
  journeyId?: string;          // Link to journey
  
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}
```

#### `journeys` (Shared Dreams)
```typescript
interface Journey {
  id: string;
  dreamId: string;             // Original dream
  ownerId: string;             // Dream owner
  members: string[];           // All participants
  memberDetails: {
    [userId: string]: {
      role: 'owner' | 'member';
      joinedAt: number;
      status: 'active' | 'completed' | 'left';
    };
  };
  chatId: string;              // Link to chat room
  status: 'active' | 'completed' | 'archived';
  createdAt: number;
}
```

#### `joinRequests`
```typescript
interface JoinRequest {
  id: string;
  dreamId: string;
  requesterId: string;
  ownerId: string;
  message?: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: number;
  respondedAt?: number;
}
```

#### `comments`
```typescript
interface Comment {
  id: string;
  dreamId: string;
  userId: string;
  text: string;
  likesCount: number;
  createdAt: number;
}
```

#### `likes` (Subcollection under dreams)
```typescript
interface Like {
  userId: string;
  createdAt: number;
}
```

#### `chats`
```typescript
interface Chat {
  id: string;
  type: 'journey' | 'dm';
  journeyId?: string;          // For journey chats
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  createdAt: number;
}
```

#### `messages` (Realtime Database Node)
```json
// Path: /messages/{chatId}/{messageId}
{
  "senderId": "string",
  "text": "string",
  "media": {
    "type": "image | video",
    "url": "string"
  },
  "reactions": {
    "emoji_code": ["userId1", "userId2"]
  },
  "readBy": {
    "userId": {
      "timestamp": 1234567890
    }
  },
  "createdAt": 1234567890
}
```

#### `notifications`
```typescript
interface Notification {
  id: string;
  userId: string;              // Recipient
  type: 'like' | 'comment' | 'join_request' | 'request_approved' | 'new_message';
  actorId: string;             // Who triggered
  dreamId?: string;
  journeyId?: string;
  read: boolean;
  createdAt: number;
}
```

---

## 4. Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Dreams
    match /dreams/{dreamId} {
      allow read: if resource.data.visibility == 'public'
                  || request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
    
    // Journeys
    match /journeys/{journeyId} {
      allow read: if request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.ownerId
                    || request.auth.uid in resource.data.members;
    }
    
    // Comments
    match /comments/{commentId} {
      allow read: if true; // Public dreams have public comments
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
    
    // Chats & Messages
    match /chats/{chatId} {
      allow read, write: if request.auth.uid in resource.data.participants;
      
        allow read: if request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        allow write: if false; // Messages are in Realtime DB
      }
    }
  }
}

// Realtime Database Rules
/*
{
  "rules": {
    "messages": {
      "$chatId": {
        ".read": "root.child('firestore/chats/' + $chatId).val().participants[auth.uid] == true", // Simplified logic
        ".write": "root.child('firestore/chats/' + $chatId).val().participants[auth.uid] == true"
      }
    },
    "presence": {
       // ...
    }
  }
}
*/
```

---

## 5. State Management (Zustand)

```typescript
// stores/useAppStore.ts
interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Dreams
  myDreams: Dream[];
  publicDreams: Dream[];
  fetchMyDreams: () => Promise<void>;
  fetchPublicDreams: (interest?: string) => Promise<void>;
  
  // Journeys
  journeys: Journey[];
  fetchJourneys: () => Promise<void>;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
```

---

## 6. Real-time Architecture

### Chat Messages
- Use Firebase Realtime Database for messages (lower latency)
- Firestore for chat metadata (participants, last message)

### Presence System
- Track online/typing status in Realtime Database

### Push Notifications
- Expo Notifications + FCM
- Cloud Function triggers on new message/notification

---

## 7. File Structure

```
src/
├── app/                    # Expo Router screens
│   ├── (auth)/
│   ├── (tabs)/
│   ├── dream/
│   ├── chat/
│   └── _layout.tsx
│
├── components/
│   ├── ui/                 # Atoms (Button, Input, Card)
│   ├── dream/              # Dream-specific components
│   ├── chat/               # Chat components
│   └── shared/             # Layout, Navigation
│
├── services/
│   ├── auth.ts
│   ├── dreams.ts
│   ├── journeys.ts
│   ├── chat.ts
│   ├── notifications.ts
│   └── storage.ts
│
├── stores/
│   ├── useAppStore.ts
│   └── useChatStore.ts
│
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   └── index.ts
│
├── types/
│   ├── user.ts
│   ├── dream.ts
│   ├── journey.ts
│   └── chat.ts
│
└── utils/
    ├── formatters.ts
    └── validators.ts
```

---

## 8. API Design (Cloud Functions)

### Endpoints (Future)
- `POST /api/dreams/:id/join` — Request to join
- `POST /api/dreams/:id/approve/:userId` — Approve join request
- `GET /api/feed` — Personalized public feed
- `POST /api/report` — Report content

---

## 9. Performance Considerations

1. **Pagination:** All lists use cursor-based pagination
2. **Image Optimization:** Compress before upload, use CDN
3. **Caching:** Offline-first with Firestore persistence
4. **Lazy Loading:** Load chat messages on scroll
5. **Memoization:** React.memo for list items

---

## 10. Analytics Events (VC-Ready)

| Event | Properties |
|-------|------------|
| `dream_created` | category, visibility |
| `dream_shared` | dreamId, interest_tags |
| `join_requested` | dreamId |
| `journey_started` | dreamId, member_count |
| `message_sent` | journeyId |
| `dream_completed` | time_to_complete, shared |
