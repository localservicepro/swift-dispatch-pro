

## Fix: Select Dropdowns Not Scrollable

### Root Cause
The `SelectPrimitive.Viewport` has `h-[var(--radix-select-trigger-height)]` applied when `position="popper"`. This constrains the viewport height to match the trigger button height (~40px), preventing any scrolling. The `overflow-auto` on the outer `Content` element has no effect because the inner `Viewport` doesn't grow beyond the trigger height.

### Solution
Change the Viewport from `h-[var(--radix-select-trigger-height)]` (fixed height) to `max-h-[300px]` with `overflow-y-auto`. This lets the viewport expand to fit content up to 300px, then scroll. The Content element keeps its existing styles.

### Changes

#### `src/components/ui/select.tsx`
- Line 88: Replace `h-[var(--radix-select-trigger-height)]` with `max-h-[300px] overflow-y-auto` in the Viewport className for `position === "popper"`

This single change fixes scrolling for all Select dropdowns (Delivery Time, Driver, Truck Type, etc.).

