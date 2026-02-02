# API Specification
## DreamSync v2.0 - Firebase Services API

> **Last Updated:** 2026-02-02  
> **Backend:** Firebase (Firestore, Auth, Storage, Cloud Functions)

---

## Overview

DreamSync uses Firebase as the backend. Most data operations are direct Firestore reads/writes with security rules enforcement. Cloud Functions handle complex operations, notifications, and background tasks.

```
Client (React Native)
    │
    ├── Firebase Auth → Authentication
    ├── Firestore → Data CRUD
    ├── Cloud Storage → Images/Media
    └── Cloud Functions → Complex Operations
```

---

## Authentication API

### Sign Up
```typescript
import { createUserWithEmailAndPassword } from 'firebase/auth';

// Create user
const { user } = await createUserWithEmailAndPassword(auth, email, password);

// Create user document
await setDoc(doc(db, 'users', user.uid), {
  id: user.uid,
  email: user.email,
  displayName: displayName,
  username: generateUsername(),
  isVerified: false,
  verificationLevel: 'none',
  stats: { dreamsCount: 0, completedCount: 0, sharedCount: 0, journeysCount: 0 },
  preferences: { theme: 'system', notifications: true, emailUpdates: false },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  lastActiveAt: serverTimestamp(),
});
```

### Sign In
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';

const { user } = await signInWithEmailAndPassword(auth, email, password);
```

### Sign Out
```typescript
import { signOut } from 'firebase/auth';

await signOut(auth);
```

---

## Dreams API

### Create Dream
```typescript
interface CreateDreamInput {
  title: string;
  description?: string;
  category: Category;
  coverImage?: string;
  targetDate?: Date;
  visibility: 'private' | 'public';
  interests?: string[];
}

async function createDream(input: CreateDreamInput): Promise<string> {
  const dreamRef = doc(collection(db, 'dreams'));
  
  await setDoc(dreamRef, {
    ...input,
    id: dreamRef.id,
    userId: auth.currentUser.uid,
    status: 'dream',
    likesCount: 0,
    commentsCount: 0,
    joinRequestsCount: 0,
    isShared: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Update user stats
  await updateDoc(doc(db, 'users', auth.currentUser.uid), {
    'stats.dreamsCount': increment(1),
    ...(input.visibility === 'public' && { 'stats.sharedCount': increment(1) }),
  });
  
  return dreamRef.id;
}
```

### Get My Dreams
```typescript
async function getMyDreams(status?: Status): Promise<Dream[]> {
  let q = query(
    collection(db, 'dreams'),
    where('userId', '==', auth.currentUser.uid),
    orderBy('createdAt', 'desc')
  );
  
  if (status) {
    q = query(q, where('status', '==', status));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Dream);
}
```

### Get Public Feed
```typescript
async function getPublicFeed(
  lastDoc?: DocumentSnapshot,
  category?: Category,
  limit: number = 20
): Promise<{ dreams: Dream[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, 'dreams'),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(limit)
  );
  
  if (category) {
    q = query(q, where('category', '==', category));
  }
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  return {
    dreams: snapshot.docs.map(doc => doc.data() as Dream),
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
  };
}
```

### Update Dream
```typescript
async function updateDream(dreamId: string, updates: Partial<Dream>): Promise<void> {
  await updateDoc(doc(db, 'dreams', dreamId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
```

### Delete Dream
```typescript
async function deleteDream(dreamId: string): Promise<void> {
  // Delete dream document
  await deleteDoc(doc(db, 'dreams', dreamId));
  
  // Update user stats (via Cloud Function or client)
  await updateDoc(doc(db, 'users', auth.currentUser.uid), {
    'stats.dreamsCount': increment(-1),
  });
}
```

### Update Dream Status
```typescript
async function updateDreamStatus(dreamId: string, status: Status): Promise<void> {
  const updates: any = { status, updatedAt: serverTimestamp() };
  
  if (status === 'done') {
    updates.completedAt = serverTimestamp();
    // Update user stats
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      'stats.completedCount': increment(1),
    });
  }
  
  await updateDoc(doc(db, 'dreams', dreamId), updates);
}
```

---

## Social API

### Like Dream
```typescript
async function likeDream(dreamId: string): Promise<void> {
  const userId = auth.currentUser.uid;
  const likeRef = doc(db, 'dreams', dreamId, 'likes', userId);
  
  await setDoc(likeRef, {
    userId,
    createdAt: serverTimestamp(),
  });
  
  // Update count
  await updateDoc(doc(db, 'dreams', dreamId), {
    likesCount: increment(1),
  });
}
```

### Unlike Dream
```typescript
async function unlikeDream(dreamId: string): Promise<void> {
  const userId = auth.currentUser.uid;
  
  await deleteDoc(doc(db, 'dreams', dreamId, 'likes', userId));
  
  await updateDoc(doc(db, 'dreams', dreamId), {
    likesCount: increment(-1),
  });
}
```

### Add Comment
```typescript
async function addComment(dreamId: string, text: string): Promise<string> {
  const commentRef = doc(collection(db, 'dreams', dreamId, 'comments'));
  
  await setDoc(commentRef, {
    id: commentRef.id,
    userId: auth.currentUser.uid,
    text,
    likesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  await updateDoc(doc(db, 'dreams', dreamId), {
    commentsCount: increment(1),
  });
  
  return commentRef.id;
}
```

### Get Comments
```typescript
async function getComments(dreamId: string): Promise<Comment[]> {
  const q = query(
    collection(db, 'dreams', dreamId, 'comments'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Comment);
}
```

---

## Journeys API

### Request to Join Dream
```typescript
async function requestToJoin(dreamId: string, message?: string): Promise<string> {
  const dream = await getDoc(doc(db, 'dreams', dreamId));
  
  const requestRef = doc(collection(db, 'joinRequests'));
  await setDoc(requestRef, {
    id: requestRef.id,
    dreamId,
    requesterId: auth.currentUser.uid,
    ownerId: dream.data().userId,
    message: message || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  
  // Update count
  await updateDoc(doc(db, 'dreams', dreamId), {
    joinRequestsCount: increment(1),
  });
  
  // Create notification (via Cloud Function)
  
  return requestRef.id;
}
```

### Get Pending Requests (Owner)
```typescript
async function getPendingRequests(): Promise<JoinRequest[]> {
  const q = query(
    collection(db, 'joinRequests'),
    where('ownerId', '==', auth.currentUser.uid),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as JoinRequest);
}
```

### Approve Join Request
```typescript
async function approveRequest(requestId: string): Promise<void> {
  const request = await getDoc(doc(db, 'joinRequests', requestId));
  const { dreamId, requesterId, ownerId } = request.data();
  
  // Check if journey exists
  let journeyId: string;
  const existingJourney = await getDocs(query(
    collection(db, 'journeys'),
    where('dreamId', '==', dreamId)
  ));
  
  if (existingJourney.empty) {
    // Create new journey
    const journeyRef = doc(collection(db, 'journeys'));
    const chatRef = doc(collection(db, 'chats'));
    
    await setDoc(journeyRef, {
      id: journeyRef.id,
      dreamId,
      ownerId,
      members: [ownerId, requesterId],
      memberCount: 2,
      memberDetails: {
        [ownerId]: { role: 'owner', joinedAt: Date.now(), status: 'active' },
        [requesterId]: { role: 'member', joinedAt: Date.now(), status: 'active' },
      },
      chatId: chatRef.id,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Create chat
    await setDoc(chatRef, {
      id: chatRef.id,
      type: 'journey',
      journeyId: journeyRef.id,
      participants: [ownerId, requesterId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    journeyId = journeyRef.id;
    
    // Update dream
    await updateDoc(doc(db, 'dreams', dreamId), {
      isShared: true,
      journeyId: journeyRef.id,
    });
  } else {
    // Add to existing journey
    journeyId = existingJourney.docs[0].id;
    await updateDoc(doc(db, 'journeys', journeyId), {
      members: arrayUnion(requesterId),
      memberCount: increment(1),
      [`memberDetails.${requesterId}`]: { role: 'member', joinedAt: Date.now(), status: 'active' },
      updatedAt: serverTimestamp(),
    });
    
    // Add to chat
    const journey = existingJourney.docs[0].data();
    await updateDoc(doc(db, 'chats', journey.chatId), {
      participants: arrayUnion(requesterId),
      updatedAt: serverTimestamp(),
    });
  }
  
  // Update request status
  await updateDoc(doc(db, 'joinRequests', requestId), {
    status: 'approved',
    respondedAt: serverTimestamp(),
  });
  
  // Update user stats
  await updateDoc(doc(db, 'users', requesterId), {
    'stats.journeysCount': increment(1),
  });
}
```

### Get My Journeys
```typescript
async function getMyJourneys(): Promise<Journey[]> {
  const q = query(
    collection(db, 'journeys'),
    where('members', 'array-contains', auth.currentUser.uid),
    where('status', '==', 'active')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Journey);
}
```

---

## Chat API

### Send Message
```typescript
async function sendMessage(chatId: string, text: string, media?: { url: string; type: 'image' | 'video' }): Promise<void> {
  const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
  
  await setDoc(messageRef, {
    id: messageRef.id,
    senderId: auth.currentUser.uid,
    text,
    ...(media && { mediaUrl: media.url, mediaType: media.type }),
    readBy: [auth.currentUser.uid],
    createdAt: serverTimestamp(),
  });
  
  // Update chat
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: {
      text: media ? (media.type === 'image' ? '📷 Photo' : '🎥 Video') : text,
      senderId: auth.currentUser.uid,
      timestamp: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
}
```

### Get Messages (Real-time)
```typescript
function subscribeToMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => doc.data() as Message);
    callback(messages.reverse());
  });
}
```

---

## Cloud Functions (Server-side)

### Trigger: On Join Request Approved
```typescript
// functions/src/index.ts
exports.onJoinRequestApproved = functions.firestore
  .document('joinRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    if (before.status === 'pending' && after.status === 'approved') {
      // Create notification for requester
      await createNotification({
        userId: after.requesterId,
        type: 'request_approved',
        actorId: after.ownerId,
        dreamId: after.dreamId,
      });
      
      // Send push notification
      await sendPushNotification(after.requesterId, {
        title: 'Request Approved!',
        body: 'Your request to join a dream was approved.',
      });
    }
  });
```

### Trigger: On New Message
```typescript
exports.onNewMessage = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    const { chatId } = context.params;
    
    const chat = await admin.firestore().doc(`chats/${chatId}`).get();
    const participants = chat.data().participants;
    
    // Notify all participants except sender
    for (const userId of participants) {
      if (userId !== message.senderId) {
        await createNotification({
          userId,
          type: 'new_message',
          actorId: message.senderId,
        });
      }
    }
  });
```

---

## Storage API

### Upload Image
```typescript
async function uploadImage(uri: string, path: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  
  return await getDownloadURL(storageRef);
}

// Usage
const coverUrl = await uploadImage(
  localUri,
  `dreams/${dreamId}/cover.jpg`
);
```

---

## Error Handling

All API functions should use this pattern:
```typescript
async function apiCall(): Promise<Result> {
  try {
    // ... operation
  } catch (error) {
    if (error.code === 'permission-denied') {
      throw new Error('You do not have permission for this action');
    }
    if (error.code === 'not-found') {
      throw new Error('Resource not found');
    }
    console.error('API Error:', error);
    throw error;
  }
}
```

---

## Rate Limits & Quotas

| Operation | Limit |
|-----------|-------|
| Firestore reads | 50,000/day (free tier) |
| Firestore writes | 20,000/day (free tier) |
| Storage | 5GB (free tier) |
| Cloud Functions | 125,000 invocations/month |

For production, upgrade to Blaze plan.
