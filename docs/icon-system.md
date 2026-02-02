# Icon System
## DreamSync v2.0 - Lucide Icons Guide

> **Last Updated:** 2026-02-02  
> **Icon Library:** Lucide React Native

---

## Installation

```bash
npm install lucide-react-native
```

---

## Usage

```tsx
import { Home, Globe, Users, User, Heart, MessageCircle } from 'lucide-react-native';

// Basic usage
<Home size={24} color="#A78BFA" />

// With theme
<Home size={24} color={colors.primary} strokeWidth={2} />
```

---

## Icon Categories

### Navigation Icons

| Icon | Name | Usage |
|------|------|-------|
| 🏠 | `Home` | Home tab |
| 🌍 | `Globe` | Community tab |
| 👥 | `Users` | Journeys tab |
| 👤 | `User` | Account tab |

```tsx
import { Home, Globe, Users, User } from 'lucide-react-native';
```

### Status Icons

| Icon | Name | Status |
|------|------|--------|
| 🌙 | `Moon` | Dream (aspiration) |
| 🔥 | `Flame` | Doing (in progress) |
| 🏆 | `Trophy` | Done (achieved) |
| ⭐ | `Star` | Featured |

```tsx
import { Moon, Flame, Trophy, Star } from 'lucide-react-native';
```

### Action Icons

| Icon | Name | Action |
|------|------|--------|
| ➕ | `Plus` | Add new |
| ❤️ | `Heart` | Like |
| 💬 | `MessageCircle` | Comment |
| 🔗 | `Share2` | Share |
| ✏️ | `Pencil` | Edit |
| 🗑️ | `Trash2` | Delete |
| ✅ | `Check` | Complete |
| ❌ | `X` | Close/Cancel |

```tsx
import { Plus, Heart, MessageCircle, Share2, Pencil, Trash2, Check, X } from 'lucide-react-native';
```

### UI Icons

| Icon | Name | Usage |
|------|------|-------|
| ← | `ChevronLeft` | Back |
| → | `ChevronRight` | Forward |
| ↓ | `ChevronDown` | Expand |
| ↑ | `ChevronUp` | Collapse |
| 🔍 | `Search` | Search |
| ⚙️ | `Settings` | Settings |
| 🔔 | `Bell` | Notifications |
| 📷 | `Camera` | Camera |
| 🖼️ | `Image` | Gallery |
| 📅 | `Calendar` | Date picker |

```tsx
import { ChevronLeft, ChevronRight, Search, Settings, Bell, Camera, Image, Calendar } from 'lucide-react-native';
```

### Category Icons

| Category | Icon | Name |
|----------|------|------|
| Travel | ✈️ | `Plane` |
| Skill | 🎯 | `Target` |
| Adventure | ⛰️ | `Mountain` |
| Career | 💼 | `Briefcase` |
| Health | 💪 | `Dumbbell` |
| Relationship | ❤️ | `Heart` |
| Finance | 💰 | `Wallet` |
| Creative | 🎨 | `Palette` |
| Learning | 📚 | `BookOpen` |
| Other | 📌 | `Pin` |

```tsx
import { Plane, Target, Mountain, Briefcase, Dumbbell, Heart, Wallet, Palette, BookOpen, Pin } from 'lucide-react-native';

const CATEGORY_ICONS: Record<Category, React.ComponentType<any>> = {
  travel: Plane,
  skill: Target,
  adventure: Mountain,
  career: Briefcase,
  health: Dumbbell,
  relationship: Heart,
  finance: Wallet,
  creative: Palette,
  learning: BookOpen,
  other: Pin,
};
```

---

## Icon Component Wrapper

```tsx
// src/components/ui/Icon.tsx
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/src/theme';

interface IconProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ 
  icon: IconComponent, 
  size = 24, 
  color,
  strokeWidth = 2 
}: IconProps) {
  const { colors } = useTheme();
  
  return (
    <IconComponent 
      size={size} 
      color={color || colors.textSecondary}
      strokeWidth={strokeWidth}
    />
  );
}
```

---

## Icon Button Component

```tsx
// src/components/ui/IconButton.tsx
import { TouchableOpacity, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/src/theme';

interface IconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  size?: number;
  color?: string;
  variant?: 'default' | 'primary' | 'ghost';
  disabled?: boolean;
}

export function IconButton({
  icon: IconComponent,
  onPress,
  size = 24,
  color,
  variant = 'default',
  disabled = false,
}: IconButtonProps) {
  const { colors } = useTheme();
  
  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'primary': return colors.primary;
      case 'ghost': return 'transparent';
      default: return colors.surface;
    }
  };
  
  const getIconColor = () => {
    if (disabled) return colors.textMuted;
    if (color) return color;
    switch (variant) {
      case 'primary': return '#FFFFFF';
      default: return colors.textSecondary;
    }
  };
  
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: getBackgroundColor() }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <IconComponent size={size} color={getIconColor()} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

---

## Animated Icons

For animated icons (like heart pop on like):

```tsx
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Heart } from 'lucide-react-native';

const AnimatedHeart = Animated.createAnimatedComponent(Heart);

function LikeButton({ isLiked, onPress }: { isLiked: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  
  const handlePress = () => {
    scale.value = withSpring(1.3, { damping: 4 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return (
    <TouchableOpacity onPress={handlePress}>
      <Animated.View style={animatedStyle}>
        <Heart 
          size={24} 
          color={isLiked ? '#FB7185' : '#94A3B8'}
          fill={isLiked ? '#FB7185' : 'transparent'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
```

---

## Icon Guidelines

### Sizing

| Context | Size | Stroke |
|---------|------|--------|
| Tab bar | 24px | 2 |
| List item | 20px | 1.5 |
| Button | 20px | 2 |
| Header action | 24px | 2 |
| Floating action | 28px | 2.5 |

### Colors

| State | Light Mode | Dark Mode |
|-------|------------|-----------|
| Default | `textSecondary` | `textSecondary` |
| Active | `primary` | `primary` |
| Inactive | `textMuted` | `textMuted` |
| Danger | `error` | `error` |

### Do's and Don'ts

✅ **Do:**
- Use consistent sizing across similar contexts
- Use filled variants for active/selected states
- Animate icons for micro-interactions
- Maintain 44x44 touch target minimum

❌ **Don't:**
- Mix icon libraries (stick to Lucide)
- Use emojis as icons
- Make icons too small (< 16px)
- Use too many different colors

---

## Complete Icon Import List

```tsx
// Navigation
import { Home, Globe, Users, User, Menu, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react-native';

// Status
import { Moon, Flame, Trophy, Star, Clock, CheckCircle } from 'lucide-react-native';

// Actions
import { Plus, Heart, MessageCircle, Share2, Pencil, Trash2, Check, X, MoreHorizontal, MoreVertical } from 'lucide-react-native';

// UI
import { Search, Settings, Bell, BellOff, Camera, Image, Calendar, Filter, SortDesc, Eye, EyeOff } from 'lucide-react-native';

// Categories
import { Plane, Target, Mountain, Briefcase, Dumbbell, Wallet, Palette, BookOpen, Pin, Sparkles } from 'lucide-react-native';

// Communication
import { Send, MessageSquare, AtSign, Link2 } from 'lucide-react-native';

// Misc
import { LogOut, Info, HelpCircle, Shield, Moon as DarkMode, Sun as LightMode } from 'lucide-react-native';
```
