# Firebase Notifications Setup Guide

This guide covers everything you need to do in the Firebase Console and locally to get the DreamSync notification system working.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Console Setup](#firebase-console-setup)
3. [Firestore Indexes](#firestore-indexes)
4. [Firestore Security Rules](#firestore-security-rules)
5. [Cloud Functions Deployment](#cloud-functions-deployment)
6. [Local Development & Testing](#local-development--testing)
7. [Push Notifications on Device](#push-notifications-on-device)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- A Firebase project already linked to DreamSync (you should have this from the existing setup)
- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in to Firebase: `firebase login`
- Node.js 18+ (for Cloud Functions)
- A physical Android/iOS device (push notifications don't work on emulators/simulators)
- An Expo account (for Expo Push Tokens): `npx expo login`

---

## Firebase Console Setup

### 1. Verify your Firebase project

Go to [Firebase Console](https://console.firebase.google.com/) and open your project (`living-list-9ccc7` based on your config).

### 2. Enable required services

These should already be enabled from the existing app, but verify:

| Service | Where to check | Notes |
|---------|---------------|-------|
| **Authentication** | Build > Authentication | Should show Email/Password or Google provider enabled |
| **Cloud Firestore** | Build > Firestore Database | Should show existing collections (`items`, `users`, `journeys`, `chats`) |
| **Realtime Database** | Build > Realtime Database | Used for chat messages (`/messages/`) |
| **Cloud Storage** | Build > Storage | Used for image uploads |
| **Cloud Functions** | Build > Functions | **May need to be enabled** — requires Blaze (pay-as-you-go) plan |

### 3. Upgrade to Blaze plan (if not already)

Cloud Functions **require the Blaze plan**. This is pay-as-you-go but has a generous free tier:

- 2M function invocations/month free
- 400K GB-seconds compute/month free
- 200K CPU-seconds/month free

Go to **Settings (gear icon) > Usage and billing > Details & settings > Modify plan** and select Blaze.

> You won't be charged anything meaningful for development/small-scale usage.

### 4. Download `google-services.json` (Android)

1. Go to **Project Settings** (gear icon at top-left)
2. Under **Your apps**, click the Android app
3. Click **Download google-services.json**
4. Place it at the project root: `E:\Personal\LivingList\google-services.json`

> This file is referenced in `app.json` under `android.googleServicesFile`. It enables FCM on Android.

### 5. Download `GoogleService-Info.plist` (iOS, if building for iOS)

1. Same **Project Settings** page
2. Click the iOS app
3. Click **Download GoogleService-Info.plist**
4. Place it at the project root

---

## Firestore Indexes

The notification queries require composite indexes. You have two options:

### Option A: Deploy via CLI (Recommended)

```bash
cd E:\Personal\LivingList
firebase deploy --only firestore:indexes
```

This reads `firestore.indexes.json` and creates the indexes automatically.

### Option B: Create manually in Console

Go to **Firestore Database > Indexes > Composite** and add:

| Collection | Field 1 | Field 2 |
|-----------|---------|---------|
| `notifications` | `userId` Ascending | `createdAt` Descending |
| `notifications` | `userId` Ascending | `read` Ascending |

> Indexes take a few minutes to build. You'll see a "Building" status that changes to "Enabled".

### How to know if indexes are missing

If you see this error in the app logs:
```
FirebaseError: The query requires an index. You can create it here: <link>
```
Click the link — it will auto-create the index for you in the Console.

---

## Firestore Security Rules

Deploy the updated rules that include the `notifications` collection:

```bash
cd E:\Personal\LivingList
firebase deploy --only firestore:rules
```

This reads `firestore.rules` from your project root.

> **What the rules do**: Only the notification owner can read/update/delete their notifications. Only Cloud Functions (Admin SDK) can create notifications — clients cannot create fake notifications.

---

## Cloud Functions Deployment

### First-time setup

```bash
# Navigate to functions directory
cd E:\Personal\LivingList\functions

# Install dependencies
npm install

# Build TypeScript
npm run build

# Initialize Firebase in the project root (if not done)
cd E:\Personal\LivingList
firebase init
# Select "Functions" when prompted
# Choose "Use an existing project" → select your project
# Say NO to overwriting existing files
```

### Deploy functions

```bash
cd E:\Personal\LivingList\functions
npm run deploy
```

Or from the project root:
```bash
firebase deploy --only functions
```

### What gets deployed

| Function | Trigger | What it does |
|----------|---------|-------------|
| `onNewChatMessage` | RTDB `onCreate` on `/messages/{chatId}/{messageId}` | Notifies chat participants of new messages |
| `onJourneyUpdate` | Firestore `onUpdate` on `journeys/{journeyId}` | Notifies on request accepted/rejected, participant joined |
| `onNewComment` | Firestore `onCreate` on `items/{dreamId}/comments/{commentId}` | Notifies dream owner of new comments |
| `onDreamLiked` | Firestore `onUpdate` on `items/{dreamId}` | Notifies dream owner when someone likes their dream |
| `checkDueDateReminders` | Scheduled daily at 9:00 AM UTC | Sends reminders for approaching target dates |

### Verify deployment

After deploying, go to **Firebase Console > Functions**. You should see all 5 functions listed with a green checkmark.

---

## Local Development & Testing

### Running the Expo app locally

```bash
cd E:\Personal\LivingList
npm start
```

Then scan the QR code with Expo Go on your physical device. Push notifications **will not work** in a web browser or emulator.

### Testing with Firebase Emulators (optional, advanced)

Firebase emulators let you test Cloud Functions locally without deploying:

```bash
# Install emulators (one-time)
cd E:\Personal\LivingList
firebase init emulators
# Select: Functions, Firestore, Database
# Accept default ports

# Start emulators
cd functions
npm run serve
```

This starts:
- Functions emulator at `http://localhost:5001`
- Firestore emulator at `http://localhost:8080`
- Emulator UI at `http://localhost:4000`

> **Note**: The app currently connects to production Firebase, not the emulator. To use emulators you'd need to add `connectFirestoreEmulator()` calls in `firebaseConfig.ts`. For development, it's simpler to just deploy functions to production and test with real data.

### Testing the notification flow manually

1. **Chat notifications**: Open the app on two devices (or two accounts), send a chat message → the other user should receive a push notification and see it in the notification center.

2. **Community notifications**: Like or comment on someone else's public dream → the dream owner gets notified.

3. **Journey notifications**: Send a join request, then have the owner accept/reject it → the requester gets notified.

4. **Notification center**: Tap the bell icon on any tab to see all notifications. Pull down to refresh. Tap "Mark all read" (checkmark icon).

5. **Settings**: Go to Account > Notifications and toggle individual categories on/off. Toggle the master "Push Notifications" switch to disable all push.

### Viewing Cloud Function logs

```bash
# Live tail of all function logs
firebase functions:log --only onNewChatMessage

# Or view all
firebase functions:log

# Or in Firebase Console
# Go to Functions > Logs tab
```

### Testing without a second device

You can manually create a notification document in the Firestore Console to test the in-app notification center:

1. Go to **Firestore Database** in the Console
2. Click **Start collection** or navigate to the `notifications` collection
3. Click **Add document** (auto-ID is fine)
4. Add these fields:
   - `userId` (string): your Firebase Auth UID
   - `type` (string): `community_like`
   - `title` (string): `Someone liked your dream`
   - `body` (string): `"Travel to Japan" got some love!`
   - `read` (boolean): `false`
   - `createdAt` (number): current timestamp in ms (e.g., `1738944000000`)
   - `data` (map): `{ "dreamId": "some-dream-id" }`
5. Open the app → the bell icon should show an unread badge, and the notification center should display it.

> **Finding your UID**: Go to Firebase Console > Authentication > Users tab. Your UID is the long string in the "User UID" column.

---

## Push Notifications on Device

### How push tokens work

1. When you log in, the app calls `expo-notifications` to get an **Expo Push Token** (looks like `ExponentPushToken[xxxx]`)
2. This token is stored in Firestore at `users/{uid}.pushTokens` (as an array, supporting multiple devices)
3. When Cloud Functions trigger a notification, they read the recipient's `pushTokens` and POST to the [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/)
4. Expo's servers forward the notification to APNs (iOS) or FCM (Android)

### Requirements for push to work

- **Physical device** (not simulator/emulator)
- **Expo Go** or a **development build** (`npx expo prebuild && npx expo run:android`)
- **EAS project ID** configured in `app.json` or `app.config.js`. If you haven't set this up:
  ```bash
  npx eas init
  ```
  This adds `extra.eas.projectId` to your Expo config.
- **Notification permissions granted** (the app will prompt on first login)

### If push tokens aren't being stored

Check the console logs for:
- `"Push notifications require a physical device"` → you're on a simulator
- `"Push notification permission not granted"` → user denied the prompt
- `"No EAS project ID found"` → run `npx eas init`

---

## Troubleshooting

### "The query requires an index"
Deploy indexes: `firebase deploy --only firestore:indexes`, or click the link in the error message.

### "PERMISSION_DENIED" errors in Firestore
Deploy security rules: `firebase deploy --only firestore:rules`

### Cloud Functions not triggering
- Check that functions are deployed: Firebase Console > Functions
- Check logs: `firebase functions:log`
- Verify the trigger path matches your data structure (e.g., `/messages/{chatId}/{messageId}` for RTDB)

### Push notifications not arriving
- Verify the push token is stored: Check Firestore `users/{uid}` document for a `pushTokens` array
- Check Cloud Function logs for errors when sending
- Ensure the Expo Push API is reachable (not blocked by firewall)
- On Android, check that the notification channel exists and notifications aren't silenced in device settings

### "billing account not configured" error when deploying functions
You need the Blaze plan. Go to Firebase Console > Settings > Usage and billing.

### Scheduled function not running
The `checkDueDateReminders` function uses Cloud Scheduler, which requires:
- Blaze plan
- Cloud Scheduler API enabled (Firebase usually enables this automatically)
- The function must be deployed to a region that supports Cloud Scheduler

Check in Google Cloud Console > Cloud Scheduler to see if the job was created.
