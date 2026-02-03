# Plan: Remaining Features Implementation

> **Goal:** Complete the core "Chat" and "Journey" features and polish the application for launch.
> **Strategy:** Split into two distinct phases (Features & Polish) to ensure functionality before aesthetics.

---

## 🛑 Phase 1: Core Features (Chat & Journeys)

### 1.1 Chat System Infrastructure (Realtime DB)
- [ ] **Configure Firebase RTDB**
    - **Task:** Update `firebaseConfig.ts` to initialize and export `getDatabase()`.
    - **Verify:** `console.log(db)` returns a valid instance.
- [ ] **Create Chat Service (`src/services/chat.ts`)**
    *   `createChat(participants: string[], type: 'dm' | 'journey')`: Metadata in Firestore.
    *   `sendMessage(chatId, text, userId)`: Push to RTDB `/messages/{chatId}` + Update Firestore `lastMessage`.
    *   `subscribeToMessages(chatId, callback)`: Listen to RTDB node.
    *   `markAsRead(chatId, userId)`: Update RTDB `readBy`.
- [ ] **Create Chat Store (`src/stores/useChatStore.ts`)**
    - **State:** `chats: Chat[]`, `activeChatId: string`, `messages: Message[]`.
    - **Actions:** `fetchChats`, `enterChat(id)`, `sendMessage`.

### 1.2 Chat UI Components
- [ ] **Chat List Screen (`app/chat/index.tsx`)**
    - **UI:** List of active chats with `lastMessage` preview and timestamps.
    - **Comp:** `ChatListItem.tsx` (Avatar, name, truncated text, unread dot).
- [ ] **Chat Room Screen (`app/chat/[id].tsx`)**
    - **UI:** Message list (inverted), Input bar.
    - **Comp:** `MessageBubble.tsx` (Own vs Other, timestamps, read status).
    - **Comp:** `ChatInput.tsx` (Text input, send button, typing handler).
- [ ] **Hook up Journey -> Chat**
    - **Task:** Add "Chat" floating button to `app/(tabs)/journeys/[id].tsx`.
    - **Logic:** On press -> Navigation to `app/chat/[journeyChatId]`.

### 1.3 Journey & Community Logic Refinements
- [ ] **Refine Journey Filters (`app/(tabs)/journeys.tsx`)**
    - **Logic:**
        - `Explore`: Public journeys where `currentUser` is NOT a member.
        - `My Journeys`: Journeys where `currentUser` IS a member (owner or participant).
    - **Fix:** Ensure newly accepted invites allow the journey to appear in "My Journeys" immediately (optimistic update or re-fetch).
- [ ] **Community Tab Logic**
    - **Goal:** Separate "Dreams" (Public Feed) from "Journeys" (Shared Progress).
    - **Task:** Update `src/services/community.ts` queries.
    - **Filter:** Default view = Individual Public Dreams. Journey posts only show if explicitly shared to community.

---

## 🎨 Phase 2: Polish & Launch

### 2.1 Premium Aesthetics & Animation
- [ ] **Install Reanimated & Moti** (if not fully utilized).
- [ ] **Micro-interactions:**
    - Heart animation (Lottie or ScaleSpring).
    - Tab switching animations.
    - Modal entry/exit transitions.
- [ ] **Skeleton Loaders:** Replace spinners with shimmering skeletons for:
    - Dream Feed.
    - User Profile.
    - Journey List.

### 2.2 Performance
- [ ] **List Optimization:** Ensure `FlashList` or optimized `FlatList` is used.
- [ ] **Image Optimization:** Verify `expo-image` caching policies.

### 2.3 Analytics & Final Checks
- [ ] **Analytics Hook:** Create `useAnalytics` (wrapping Firebase Analytics).
- [ ] **Track Events:** `journey_joined`, `dream_created`, `message_sent`.
- [ ] **Launch Checklist Audit:** Run `checklist.py` (if available) or manual QA.

---

## ✅ Verification Checklist

### Chat
- [ ] Can create a 1-on-1 DM?
- [ ] Can create a Journey Group Chat?
- [ ] fast real-time message delivery?
- [ ] Offline message queuing works?

### Journeys
- [ ] "Explore" does not show my own journeys?
- [ ] "My Journeys" shows joined journeys instantly?

### General
- [ ] No "white screen" errors on reload.
- [ ] Dark mode looks consistent (no hardcoded blacks).
