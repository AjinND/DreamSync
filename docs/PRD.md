# Product Requirements Document (PRD)
## DreamSync v2.0

> **Version:** 2.0  
> **Last Updated:** 2026-02-02  
> **Status:** Draft for Review

---

## 1. Executive Summary

**DreamSync** is a premium social bucket list application that transforms personal dreams into shared journeys. Unlike traditional todo apps, DreamSync emphasizes community, collaboration, and celebration of life goals.

### Key Differentiators
- **Social Discovery:** Share dreams publicly, find others with similar aspirations
- **Shared Journeys:** Collaborate with others to achieve dreams together
- **Premium Experience:** Modern pastel aesthetics with smooth animations
- **All Ages:** Universal appeal from young adventurers to seasoned dreamers

---

## 2. Target Audience

| Segment | Description | Key Needs |
|---------|-------------|-----------|
| **Young Adults (18-30)** | Adventure seekers, social natives | Discovery, sharing, FOMO |
| **Mid-Career (30-45)** | "Life is short" realization | Meaningful goals, accountability |
| **Couples/Groups** | Shared experiences | Collaboration tools |
| **Seniors (45+)** | Legacy, reflection | Simple UI, achievement tracking |

### User Personas

**1. Alex (27, Urban Professional)**
- Wants to travel to 30 countries before 35
- Seeks travel partners for solo-unfriendly destinations
- Values aesthetic sharing and social validation

**2. Maya (42, Parent)**
- Dreams of learning piano, writing a book
- Needs accountability and structured progress
- Values privacy controls

**3. The Adventurers (Couple)**
- Shared bucket list for their relationship
- Track experiences together
- Celebrate milestones as a team

---

## 3. Core Features

### 3.1 Navigation Structure

| Tab | Icon | Purpose |
|-----|------|---------|
| **Home** | 🏠 | Personal dreams, CRUD, filters |
| **Community** | 🌍 | Public feed, discovery |
| **Journeys** | 🤝 | Shared dreams, collaboration |
| **Account** | 👤 | Profile, settings, stats |

### 3.2 Home Tab

**Features:**
- Create/Edit/Delete dreams
- View by Category (Travel, Skill, Adventure, etc.)
- View by Status (Dream → Doing → Done)
- Search and filter
- Quick stats dashboard

**Dream Attributes:**
- Title, Description, Category
- Status (Dream/Doing/Done)
- Cover Image
- Target Date
- Privacy (Private/Public/Interest-based)
- Tags/Interests

### 3.3 Community Tab

**Features:**
- Public feed of shared dreams
- Interest-based filtering (Reddit-style)
- Like and Comment system
- "Join Dream" request button
- User discovery

**Community Model:**
- Fully public feed (Twitter-style discovery)
- Interest-based groups (Reddit-style relevance)
- User verification badges

### 3.4 Journeys Tab

**Features:**
- Dreams being pursued with others
- Dream matching (Tinder-style)
- User approval for join requests
- Group progress tracking
- Floating chat button

**Collaboration Flow:**
1. User A shares dream publicly
2. User B sees dream, taps "Join"
3. User A receives notification, approves/declines
4. If approved, dream appears in both users' Journeys tab
5. Group chat is created

### 3.5 Chat System

**Features:**
- Group chat per shared dream
- 1-on-1 DMs
- Message reactions
- Image/media sharing
- Typing indicators
- Read receipts

### 3.6 Account Tab

**Features:**
- Profile management
- Public profile view
- Achievement badges
- Statistics (Dreams, Completed, Shared)
- Settings (Privacy, Notifications)
- Verification status
- Logout

---

## 4. Moderation Strategy

### Multi-Layer Approach

| Layer | Mechanism | When |
|-------|-----------|------|
| **Verification** | Email/phone verify to post publicly | Before first public post |
| **Community** | Upvotes/downvotes affect visibility | Ongoing |
| **AI Moderation** | Auto-flag harmful content | Real-time |
| **User Reports** | Manual review queue | As reported |

---

## 5. Design Direction

### Visual Identity
- **Style:** Modern pastel with depth
- **Mode:** Light (default) + Dark theme
- **Feel:** Premium, aspirational, welcoming

### Color Palette (Refined for Pastel)

| Role | Light Mode | Dark Mode |
|------|------------|-----------|
| Primary | Soft Lavender `#A78BFA` | Lavender `#A78BFA` |
| Secondary | Soft Teal `#5EEAD4` | Teal `#5EEAD4` |
| Accent/CTA | Coral `#FB7185` | Coral `#FB7185` |
| Background | Cream `#FEFBF6` | Deep Navy `#0F172A` |
| Surface | White `#FFFFFF` | Slate `#1E293B` |
| Text | Charcoal `#334155` | Ghost `#E2E8F0` |

### Typography
- **Headings:** Satoshi (or fallback: DM Sans)
- **Body:** General Sans (or fallback: Inter)

### Animations
- Smooth page transitions
- Micro-interactions on buttons
- Skeleton loaders
- Pull-to-refresh with custom animation
- Achievement celebrations

---

## 6. Technical Considerations

### Stack
- **Frontend:** React Native + Expo
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Real-time:** Firebase Realtime Database (Chat)
- **Push Notifications:** Expo Notifications + FCM

### Key Technical Decisions
1. **Firestore Collections:** users, dreams, comments, chats, notifications
2. **Security Rules:** User-based read/write with public read for shared dreams
3. **Image Optimization:** Compress before upload, CDN delivery
4. **Offline Support:** Local caching with sync

---

## 7. Success Metrics (VC-Ready)

| Metric | Target (Month 3) | Target (Month 6) |
|--------|------------------|------------------|
| MAU | 5,000 | 25,000 |
| DAU/MAU Ratio | 30%+ | 40%+ |
| Public Dreams Shared | 1,000 | 10,000 |
| Journeys Created | 200 | 2,000 |
| Avg. Session Duration | 5 min | 8 min |

---

## 8. Naming Decision

**Finalists:**
1. **DreamSync** — Emphasizes shared dreams, synchronization
2. **Bucketmate** — Friendly, partnership-focused

**Recommendation:** DreamSync (more premium feel, scalable brand)

---

## 9. Next Steps

1. ✅ PRD (this document)
2. Architecture Document
3. Design System (Colors, Typography, Components)
4. Database Schema
5. UI Mockups (Key Screens)
6. Implementation Roadmap
