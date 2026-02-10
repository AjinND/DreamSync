# PLAN-bucket-icon-redesign

## 1. Goal
Redesign the "Bucket" icon in the loading screen to be visually distinct, recognizable, and polished, addressing the issue that the current CSS-border-based trapezoid is vague. The new implementation will use SVG for precise shape control while maintaining existing fill animations.

## 2. User Review Required
> [!IMPORTANT]
> **New Dependency**: This plan requires installing `react-native-svg` to ensure crisp, scalable rendering of the bucket shape and to support advanced masking for the fill animation.

## 3. Proposed Changes

### Dependencies
- Add `react-native-svg` explicitly (standard for Expo projects).

### Component Layer (`src/components/loading/components`)
#### [MODIFY] `BucketShape.tsx`
- **Current**: Uses `View` borders for trapezoid shape and a separate `View` for the handle.
- **New**:
    - Replace `View` drawing with `<Svg>` components.
    - Define a `Path` for the bucket body (tapered cylinder).
    - Define a `Path` for the rim (ellipse) and handle (curved line).
    - Implement `ClipPath` or `Mask` within the SVG to constrain the `BucketFillAnimation` (liquid) to the bucket's inner shape.
    - Animate the liquid level using `AnimatedProps` from `react-native-reanimated` connected to the SVG elements (e.g., a `Rect` inside the mask).

#### [MODIFY] `BucketFillAnimation.tsx`
- **Current**: Returns a `View` with `height` styles.
- **New**:
    - Refactor to work within the SVG context OR wrap it in a `MaskedView` (if we avoid SVG masking complexity).
    - *Better Approach*: Modify it to return a shared value or an animated component that can be composed inside the `BucketShape` SVG, ensuring the fill respects the rounded corners and taper of the new bucket design.

## 4. Verification Plan

### Automated Tests
- n/a (UI visual change mostly)

### Manual Verification
1. **Visual Check**:
    - Start the app and trigger a loading state (or view the component in isolation if possible).
    - Verify the icon looks like a "bucket" (handle, rim, tapered body).
    - Verify the "liquid" fills up inside the bucket boundaries correctly.
    - Check dark mode/light mode colors match the app theme.
2. **Animation Check**:
    - Ensure the fill animation is smooth and doesn't "leak" outside the bucket lines.
    - Ensure "sparkles" still appear (they are likely overlayed, so should be fine).
3. **Responsiveness**:
    - Check the `sm`, `md`, `lg` sizes defined in `BucketShape` still work correctly.

## 5. Design Assets (ASCII Sketch)
```text
  (       )  <-- Rim (Ellipse)
   \     /   <-- Tapered Body
    \___/    <-- Rounded Bottom
     _n_     <-- Handle (Arc)
```
