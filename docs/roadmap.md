# Implementation Roadmap
## DreamSync v2.0

> **Timeline:** 4-6 weeks (MVP)  
> **Team:** Solo developer with AI assistance

---

## Phase 1: Foundation Cleanup (Week 1)

### Day 1-2: Project Reset
- [ ] Archive existing MVP code (git branch: `v1-archive`)
- [ ] Update `package.json` with new dependencies
- [ ] Setup new directory structure per architecture
- [ ] Configure Satoshi + General Sans fonts
- [ ] Create theme system (colors.ts, typography.ts)

### Day 3-4: Navigation Setup
- [ ] Configure Expo Router with new structure
- [ ] Create tab layout (Home, Community, Journeys, Account)
- [ ] Implement auth gate (protected routes)
- [ ] Create placeholder screens for all routes

### Day 5-7: Core Components
- [ ] Button component (primary, secondary, ghost)
- [ ] Card component (with press states)
- [ ] Input component (with focus glow)
- [ ] Avatar component
- [ ] Badge component (status pills)

---

## Phase 2: Core Features (Week 2)

### Home Tab
- [ ] Dashboard with stats
- [ ] Dream list (FlatList with pull-refresh)
- [ ] Category filter chips
- [ ] Status filter tabs (Dream/Doing/Done)
- [ ] Empty states with illustrations

### Dream CRUD
- [ ] Dream card component (premium design)
- [ ] Create dream modal (multi-step form)
- [ ] Dream detail screen (immersive hero)
- [ ] Edit dream flow
- [ ] Delete with confirmation

### Account Tab
- [ ] Profile screen (avatar, bio, stats)
- [ ] Edit profile flow
- [ ] Settings list
- [ ] Theme toggle (light/dark)
- [ ] Logout

---

## Phase 3: Social Features (Week 3)

### Community Tab
- [ ] Public feed (paginated)
- [ ] Interest chips/tags
- [ ] Like button with animation
- [ ] Comment section
- [ ] User profile link

### User Profiles
- [ ] Public profile view
- [ ] User's public dreams
- [ ] Follow system (optional, defer)

### Join Dream Flow
- [ ] "Join Journey" button on public dreams
- [ ] Request modal with message
- [ ] Request notifications
- [ ] Approve/Decline flow

### Moderation (Basic)
- [ ] Email verification gate
- [ ] Report button
- [ ] Block user

---

## Phase 4: Journeys & Chat (Week 4)

### Journeys Tab
- [ ] My journeys list
- [ ] Journey card (with members)
- [ ] Journey detail screen
- [ ] Member list
- [ ] Leave journey flow

### Chat System
- [ ] Chat list screen
- [ ] Group chat per journey
- [ ] Message input with send
- [ ] Message bubbles
- [ ] Typing indicator
- [ ] Floating chat button

### Notifications
- [ ] In-app notification bell
- [ ] Notification list screen
- [ ] Push notification setup (FCM)

---

## Phase 5: Polish (Week 5-6)

### Animations
- [ ] Screen transitions (fade + slide)
- [ ] Card press animations
- [ ] Like heart pop animation
- [ ] Achievement celebration
- [ ] Pull-to-refresh custom animation

### Premium Touches
- [ ] Background gradient blobs
- [ ] Skeleton loaders
- [ ] Empty state illustrations
- [ ] Onboarding flow (optional)

### Performance
- [ ] Image optimization
- [ ] List virtualization
- [ ] Offline caching
- [ ] Bundle size audit

### Testing
- [ ] Manual QA (all flows)
- [ ] Edge case testing
- [ ] Dark mode audit
- [ ] Accessibility audit

---

## Phase 6: Launch Prep

### App Store Assets
- [ ] App icon (1024x1024)
- [ ] Screenshots (6.5", 5.5")
- [ ] Feature graphic
- [ ] App description

### Analytics
- [ ] Setup Firebase Analytics
- [ ] Define key events
- [ ] Conversion funnels

### Launch Checklist
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Support email
- [ ] Final build validation

---

## Dependencies to Add

```json
{
  "new_dependencies": [
    "@shopify/flash-list",
    "react-native-mmkv",
    "react-native-gifted-chat",
    "lottie-react-native"
  ]
}
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Chat complexity | Start with basic messaging, defer reactions/threads |
| Moderation load | Start with verify-to-post, add AI later |
| Performance | Use FlashList, lazy load images |
| Scope creep | Stick to MVP features per this roadmap |

---

## Success Criteria (MVP)

- [ ] User can create, view, edit, delete dreams
- [ ] User can share dream publicly
- [ ] User can browse community feed
- [ ] User can request to join a dream
- [ ] Owner can approve/decline join requests
- [ ] Shared dreams appear in Journeys tab
- [ ] Group chat works for shared journeys
- [ ] Dark mode fully functional
- [ ] No critical bugs
