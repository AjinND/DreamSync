# Component Library
## DreamSync v2.0 - UI Components Documentation

> **Last Updated:** 2026-02-02  
> **Architecture:** Atomic Design (Atoms → Molecules → Organisms)

---

## Component Hierarchy

```
Components
├── ui/ (Atoms)
│   ├── Button
│   ├── Input
│   ├── Card
│   ├── Avatar
│   ├── Badge
│   ├── Icon
│   ├── IconButton
│   ├── Skeleton
│   ├── Divider
│   └── Text (styled)
│
├── shared/ (Molecules)
│   ├── Header
│   ├── SearchBar
│   ├── FilterChips
│   ├── StatusBadge
│   ├── UserRow
│   ├── EmptyState
│   └── LoadingState
│
└── dream/ (Organisms)
    ├── DreamCard
    ├── DreamDetail
    ├── DreamForm
    ├── CommentItem
    └── JourneyCard
```

---

## Atoms

### Button

```tsx
// src/components/ui/Button.tsx
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
}
```

**Variants:**
| Variant | Background | Text |
|---------|------------|------|
| primary | `accent` (coral) | white |
| secondary | transparent | `primary` |
| ghost | transparent | `textSecondary` |
| danger | `error` | white |

**Sizes:**
| Size | Height | Font | Padding |
|------|--------|------|---------|
| sm | 36px | 14px | 12px 16px |
| md | 44px | 16px | 12px 24px |
| lg | 52px | 18px | 16px 32px |

---

### Input

```tsx
// src/components/ui/Input.tsx
interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  maxLength?: number;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
}
```

**States:**
- Default: `border` color
- Focused: `primary` border + glow
- Error: `error` border
- Disabled: muted colors

---

### Card

```tsx
// src/components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
}
```

**Variants:**
- `default`: Surface color + shadow-md
- `elevated`: Surface color + shadow-lg
- `outlined`: Border only, no shadow

---

### Avatar

```tsx
// src/components/ui/Avatar.tsx
interface AvatarProps {
  uri?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  badge?: 'online' | 'offline' | 'verified';
}
```

**Sizes:**
| Size | Dimension |
|------|-----------|
| xs | 24px |
| sm | 32px |
| md | 40px |
| lg | 56px |
| xl | 80px |

---

### Badge

```tsx
// src/components/ui/Badge.tsx
interface BadgeProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
}
```

---

### Divider

```tsx
// src/components/ui/Divider.tsx
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
}
```

---

## Molecules

### Header

```tsx
// src/components/shared/Header.tsx
interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}
```

---

### SearchBar

```tsx
// src/components/shared/SearchBar.tsx
interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
}
```

---

### FilterChips

```tsx
// src/components/shared/FilterChips.tsx
interface FilterChipsProps<T extends string> {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  scrollable?: boolean;
}
```

---

### StatusBadge

```tsx
// src/components/shared/StatusBadge.tsx
interface StatusBadgeProps {
  status: 'dream' | 'doing' | 'done';
  size?: 'sm' | 'md';
}

// Colors:
// dream: statusDream (#818CF8)
// doing: statusDoing (#FBBF24)
// done: statusDone (#34D399)
```

---

### UserRow

```tsx
// src/components/shared/UserRow.tsx
interface UserRowProps {
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
  onPress?: () => void;
  rightElement?: React.ReactNode;
}
```

---

### EmptyState

```tsx
// src/components/shared/EmptyState.tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}
```

---

### LoadingState

```tsx
// src/components/shared/LoadingState.tsx
interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}
```

---

## Organisms

### DreamCard

```tsx
// src/components/dream/DreamCard.tsx
interface DreamCardProps {
  dream: Dream;
  onPress: () => void;
  onLike?: () => void;
  onComment?: () => void;
  variant?: 'default' | 'compact' | 'featured';
  showUser?: boolean;
}
```

**Layout (Default):**
```
┌─────────────────────────────────┐
│  [Cover Image - 16:9]           │
│                                 │
│  ┌──────────────┐               │
│  │ DREAM        │               │  ← Status badge
│  └──────────────┘               │
│                                 │
│  Title of the Dream             │  ← heading-sm
│  Short description...           │  ← body-sm, muted
│                                 │
│  [👤] @username   ❤️ 24  💬 5   │  ← Footer
└─────────────────────────────────┘
```

---

### DreamDetail

```tsx
// src/components/dream/DreamDetail.tsx
interface DreamDetailProps {
  dream: Dream;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onJoinRequest: () => void;
  isOwner: boolean;
}
```

---

### DreamForm

```tsx
// src/components/dream/DreamForm.tsx
interface DreamFormProps {
  initialValues?: Partial<Dream>;
  onSubmit: (values: DreamFormValues) => Promise<void>;
  isEditing?: boolean;
}
```

---

### CommentItem

```tsx
// src/components/dream/CommentItem.tsx
interface CommentItemProps {
  comment: Comment;
  onLike: () => void;
  onReply?: () => void;
  onDelete?: () => void;
  isOwner: boolean;
}
```

---

### JourneyCard

```tsx
// src/components/dream/JourneyCard.tsx
interface JourneyCardProps {
  journey: Journey;
  dream: Dream;
  members: User[];
  onPress: () => void;
  onChat: () => void;
}
```

---

## Implementation Status

| Component | Status | File |
|-----------|--------|------|
| **Atoms** | | |
| Button | 🔴 TODO | - |
| Input | 🔴 TODO | - |
| Card | 🔴 TODO | - |
| Avatar | 🔴 TODO | - |
| Badge | 🔴 TODO | - |
| Icon | 🔴 TODO | - |
| IconButton | 🔴 TODO | - |
| Skeleton | ✅ Done | `src/components/ui/Skeleton.tsx` |
| Divider | 🔴 TODO | - |
| **Molecules** | | |
| Header | 🔴 TODO | - |
| SearchBar | 🔴 TODO | - |
| FilterChips | 🔴 TODO | - |
| StatusBadge | 🔴 TODO | - |
| UserRow | 🔴 TODO | - |
| EmptyState | 🔴 TODO | - |
| LoadingState | 🔴 TODO | - |
| OfflineBanner | ✅ Done | `src/components/ui/OfflineBanner.tsx` |
| AnimatedPressable | ✅ Done | `src/components/ui/AnimatedPressable.tsx` |
| **Organisms** | | |
| DreamCard | 🔴 TODO | - |
| DreamDetail | 🔴 TODO | - |
| DreamForm | 🔴 TODO | - |
| CommentItem | 🔴 TODO | - |
| JourneyCard | 🔴 TODO | - |

---

## Usage Example

```tsx
import { Button, Input, Card, Avatar, Badge } from '@/src/components/ui';
import { Header, SearchBar, FilterChips, EmptyState } from '@/src/components/shared';
import { DreamCard, DreamForm } from '@/src/components/dream';

function MyScreen() {
  return (
    <View>
      <Header title="My Dreams" />
      <SearchBar value={search} onChangeText={setSearch} />
      <FilterChips options={STATUS_OPTIONS} selected={filter} onSelect={setFilter} />
      
      {dreams.length === 0 ? (
        <EmptyState 
          icon={Moon}
          title="No Dreams Yet"
          description="Start dreaming big!"
          action={{ label: 'Add Dream', onPress: () => {} }}
        />
      ) : (
        dreams.map(dream => (
          <DreamCard key={dream.id} dream={dream} onPress={() => {}} />
        ))
      )}
    </View>
  );
}
```
