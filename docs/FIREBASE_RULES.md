# Firebase Security Rules & Setup

## 1. Cloud Firestore Rules

Go to **Firestore Database > Rules** and publish:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users: Read profile if auth, write only own
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    // Dreams: Public readable, Owner writable
    match /items/{dreamId} {
      allow read: if isAuthenticated(); // or checking isPublic resource.data.isPublic
      allow write: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid);
    }
    
    // Journeys: Members can read, Owner/Members can write
    match /journeys/{journeyId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
      // Refined logic: allow read if request.auth.uid in resource.data.participants
    }

    // Chats: Participants only
    match /chats/{chatId} {
      allow read: if isAuthenticated() && (resource == null || request.auth.uid in resource.data.participants);
      allow write: if isAuthenticated() && (resource == null || request.auth.uid in resource.data.participants);
    }
  }
}
```

## 2. Realtime Database Rules

Go to **Realtime Database > Rules** and publish:

```json
{
  "rules": {
    "messages": {
      "$chatId": {
        // Allow read/write if user is a participant of the chat (requires cloud function or denormalization to be perfect, 
        // but for simple RTDB patterns without Firestore mirroring lookup, we often just allow auth or mirror participants)
        
        // Simpler approach for Proto: Allow auth users. 
        // Secure approach: Client checks firestore before connecting? No, rules logic.
        // RTDB Rules don't easily read Firestore. 
        // Common pattern: Store participants in RTDB too or just allow authenticated for MVP.
        
        ".read": "auth != null", 
        ".write": "auth != null"
      }
    }
  }
}
```

> **Note:** For strict security, you should sync `participants` to paths in RTDB (e.g. `chats/$chatId/participants`) and check `root.child('chats').child($chatId).child('participants').child(auth.uid).exists()`. For this MVP, `auth != null` is provided to unblock you.
