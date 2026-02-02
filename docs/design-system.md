# Design System
## DreamSync - Premium Pastel Theme

> **Philosophy:** Dreamy, aspirational, welcoming. Not another Todo app.  
> **Core Principle:** Pastel warmth with premium depth. Simple but not boring.

---

## 1. Color Palette

### Light Theme (Default)

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Soft Lavender | `#A78BFA` | Buttons, links, highlights |
| **Secondary** | Mint Teal | `#5EEAD4` | Success, achievements |
| **Accent** | Warm Coral | `#FB7185` | CTAs, notifications |
| **Background** | Warm Cream | `#FEFBF6` | App background |
| **Surface** | Pure White | `#FFFFFF` | Cards, modals |
| **Text Primary** | Deep Charcoal | `#1E293B` | Headings |
| **Text Secondary** | Slate | `#64748B` | Body, captions |
| **Border** | Mist | `#E2E8F0` | Dividers, input borders |

### Dark Theme

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Lavender | `#A78BFA` | Same as light |
| **Secondary** | Teal | `#5EEAD4` | Same as light |
| **Accent** | Coral | `#FB7185` | Same as light |
| **Background** | Deep Navy | `#0F172A` | App background |
| **Surface** | Slate | `#1E293B` | Cards, modals |
| **Text Primary** | Ghost White | `#F1F5F9` | Headings |
| **Text Secondary** | Cool Gray | `#94A3B8` | Body, captions |
| **Border** | Slate Dark | `#334155` | Dividers, input borders |

### Status Colors

| Status | Light | Dark |
|--------|-------|------|
| **Dream** (Aspiration) | `#818CF8` Indigo | `#818CF8` |
| **Doing** (In Progress) | `#FBBF24` Amber | `#FBBF24` |
| **Done** (Achieved) | `#34D399` Emerald | `#34D399` |

### Gradient Accents

```css
/* Dream Glow - for hero sections */
.gradient-dream {
  background: linear-gradient(135deg, #A78BFA 0%, #818CF8 50%, #5EEAD4 100%);
}

/* Achievement - for celebrations */
.gradient-achieve {
  background: linear-gradient(135deg, #34D399 0%, #5EEAD4 100%);
}

/* Warm Coral - for CTAs */
.gradient-cta {
  background: linear-gradient(135deg, #FB7185 0%, #F472B6 100%);
}
```

---

## 2. Typography

### Font Stack

| Role | Font | Fallback | Weight |
|------|------|----------|--------|
| **Display** | Satoshi | DM Sans, system-ui | 700, 800 |
| **Body** | General Sans | Inter, system-ui | 400, 500, 600 |
| **Mono** | JetBrains Mono | monospace | 400 |

### Scale

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `display-xl` | 48px | 1.1 | Hero headlines |
| `display` | 36px | 1.2 | Section titles |
| `heading-lg` | 28px | 1.3 | Screen titles |
| `heading` | 24px | 1.3 | Card titles |
| `heading-sm` | 20px | 1.4 | Subtitles |
| `body-lg` | 18px | 1.6 | Emphasized text |
| `body` | 16px | 1.6 | Default body |
| `body-sm` | 14px | 1.5 | Captions, labels |
| `caption` | 12px | 1.4 | Timestamps, meta |

---

## 3. Spacing & Layout

### Spacing Scale (8pt grid)

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Icon gaps |
| `space-2` | 8px | Tight padding |
| `space-3` | 12px | Input padding |
| `space-4` | 16px | Card padding |
| `space-5` | 20px | Standard gap |
| `space-6` | 24px | Section padding |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | Hero padding |
| `space-12` | 48px | Screen margins |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 8px | Inputs, small buttons |
| `rounded` | 12px | Buttons, cards |
| `rounded-lg` | 16px | Large cards |
| `rounded-xl` | 24px | Modals, bottom sheets |
| `rounded-full` | 999px | Avatars, pills |

---

## 4. Shadow System

### Light Mode

| Level | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle lift |
| `shadow` | `0 4px 12px rgba(0,0,0,0.08)` | Cards |
| `shadow-lg` | `0 12px 24px rgba(0,0,0,0.12)` | Modals, FAB |
| `shadow-xl` | `0 24px 48px rgba(0,0,0,0.16)` | Hero images |

### Dark Mode

| Level | Value | Usage |
|-------|-------|-------|
| `shadow-glow-sm` | `0 0 8px rgba(167,139,250,0.3)` | Primary glow |
| `shadow-glow` | `0 0 16px rgba(167,139,250,0.4)` | Buttons |
| `shadow-glow-lg` | `0 0 32px rgba(167,139,250,0.5)` | FAB, modals |

---

## 5. Animation Principles

### Timing

| Duration | Usage |
|----------|-------|
| `100ms` | Micro-interactions (button press) |
| `200ms` | State changes (hover, focus) |
| `300ms` | Simple transitions (slide, fade) |
| `500ms` | Complex entrances (modal, screen) |
| `800ms` | Elaborate celebrations |

### Easing

| Curve | Value | Usage |
|-------|-------|-------|
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Entrances |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Emphasis |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful bounce |

### Key Animations

1. **Screen Transitions:** Slide + Fade (300ms)
2. **Card Press:** Scale down 0.98 (100ms)
3. **Like Heart:** Pop + Particle burst (500ms)
4. **Achievement:** Confetti + Scale (800ms)
5. **Pull Refresh:** Custom dream bubble animation

---

## 6. Component Patterns

### Dream Card

```
┌─────────────────────────────────┐
│  [Cover Image - 16:9 ratio]     │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🌙 DREAM                │    │  ← Status badge
│  └─────────────────────────┘    │
│                                 │
│  Title of the Dream              │  ← heading-sm
│  Short description here...       │  ← body-sm, muted
│                                 │
│  [Avatar] Username   ❤️ 24  💬 5 │  ← Footer
└─────────────────────────────────┘
```

### Bottom Tab Bar

```
┌─────────────────────────────────────────────┐
│                                             │
│   🏠        🌍        🤝        👤          │
│  Home   Community  Journeys  Account        │
│                                             │
│  [Floating + FAB for Home tab]              │
└─────────────────────────────────────────────┘
```

### Floating Chat Button (Journeys Tab)

```
                                    ┌──────┐
                                    │  💬  │  ← Floating, pulsing glow
                                    │      │     in dark mode
                                    └──────┘
```

---

## 7. Icon System

**Source:** Lucide Icons (consistent, open source)

| Context | Icons |
|---------|-------|
| **Navigation** | Home, Globe, Users, User |
| **Actions** | Plus, Heart, MessageCircle, Share2 |
| **Status** | Moon (Dream), Flame (Doing), Trophy (Done) |
| **UI** | X, ChevronLeft, ChevronRight, Search |

---

## 8. Premium Touches

### Background Elements
- Subtle animated gradient blobs (low opacity)
- Noise texture overlay for depth
- Parallax image scrolling on detail screens

### Micro-interactions
- Button ripple on press
- Input focus glow
- Card tilt on drag (subtle)
- Tab switch spring animation

### Celebration Moments
- Dream completed → Confetti burst
- First dream shared → Achievement badge reveal
- Journey started → Connection animation

---

## 9. Accessibility

- **Contrast:** 4.5:1 minimum for all text
- **Touch targets:** 44x44px minimum
- **Focus states:** Visible ring on keyboard navigation
- **Motion:** Respect `prefers-reduced-motion`
- **Screen readers:** Proper labels for all interactive elements

---

## 10. Anti-Patterns (DO NOT)

| ❌ Don't | ✅ Do |
|----------|-------|
| Use emojis as icons | Use Lucide SVG icons |
| Use pure black (#000) | Use deep navy for dark |
| Use harsh shadows in dark mode | Use soft glows |
| Make everything rounded | Mix sharp and soft corners |
| Overuse gradients | Use gradients sparingly |
| Ignore dark mode | Design both themes equally |
