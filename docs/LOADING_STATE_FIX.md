# Dream Detail Loading State Fix

## Issue
When opening a dream from the community tab, the screen briefly shows "Dream Not Found" for ~1 second before loading the actual dream content.

## Root Cause
The component was checking `if (!item)` immediately on mount, before the async fetch completed:

1. Component mounts with `item = undefined` (initial state)
2. Renders "Dream Not Found" immediately (line 431)
3. `useEffect` runs and fetches the dream
4. Item loads and re-renders with actual content

This caused a flash of the "Not Found" screen while data was loading.

## Solution
Added proper loading state handling:

### Changes Made

**File:** `app/item/[id].tsx`

1. **Initialize loading state correctly** (line 100):
   ```tsx
   // Before
   const [isLoading, setIsLoading] = useState(false);

   // After
   const [isLoading, setIsLoading] = useState(!items.find((i) => i.id === id));
   ```
   - If item is NOT in local cache → start with `isLoading = true`
   - If item IS in local cache → start with `isLoading = false`

2. **Add loading state check before "Not Found"** (line ~431):
   ```tsx
   // Loading State - show loader while fetching
   if (isLoading) {
       return (
           <SafeAreaView>
               <BucketLoaderFull message="Loading dream..." />
           </SafeAreaView>
       );
   }

   // Not Found State - only after loading completes
   if (!item) {
       return (
           <SafeAreaView>
               <EmptyState title="Dream Not Found" ... />
           </SafeAreaView>
       );
   }
   ```

3. **Added BucketLoaderFull import** (line ~24):
   ```tsx
   import { BucketLoaderFull } from '@/src/components/loading';
   ```

## State Flow

### Before Fix:
```
Mount → item = undefined → "Dream Not Found" → Fetch → item = data → Render dream
         (flash!)
```

### After Fix:
```
Mount → item = undefined → isLoading = true → "Loading dream..." → Fetch → item = data → Render dream
         (smooth transition)
```

### With Cache:
```
Mount → item = cached data → isLoading = false → Render dream immediately
         (instant)
```

## Verification

### Test Case 1: Opening from Community Feed (no cache)
- [ ] Click on a dream card in community tab
- [ ] Should see "Loading dream..." spinner
- [ ] Should NOT see "Dream Not Found" flash
- [ ] Should smoothly transition to dream content

### Test Case 2: Opening Own Dream (cached)
- [ ] Open a dream you own (already in local store)
- [ ] Should render immediately with no loader
- [ ] No flash or loading state

### Test Case 3: Invalid Dream ID
- [ ] Navigate to `/item/invalid-id-123`
- [ ] Should see "Loading dream..." briefly
- [ ] Should then show "Dream Not Found" with "Go Back" button

## Performance Impact

**Positive:**
- Eliminates jarring flash of "Not Found" screen
- Better UX with proper loading feedback
- Instant render for cached items

**Neutral:**
- No performance degradation
- Same number of renders
- Same fetch behavior

## Related Files

- `app/item/[id].tsx` - Main screen with loading logic
- `src/components/loading/BucketLoaderFull.tsx` - Loading spinner component
- `src/services/community.ts` - Fetches public dreams
- `src/store/useBucketStore.ts` - Local cache for owned dreams
