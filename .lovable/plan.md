

## Fix: Scrolling Not Working in Time Slot and Driver Dropdowns

### Root Cause

The `TimeSlotSelector` and `DriverSelector` dropdowns open inside a `Dialog` that has `overflow-y-auto` on its `DialogContent` (line 53 of `OrderManagementDialogs.tsx`). When the user tries to scroll inside the dropdown's `CommandList`, the scroll/wheel events bubble up through the DOM and get captured by the parent dialog's scroll container instead. This prevents the dropdown list from scrolling.

Additionally, `DeliveryAddressStep.tsx` (line 165) still uses the old `Select` component for delivery time instead of the new `TimeSlotSelector` — this was missed in the previous update.

### Fix

#### 1. `src/components/order/TimeSlotSelector.tsx`
Add `onWheel` with `stopPropagation()` on the `PopoverContent` to prevent scroll events from bubbling to the parent dialog. Also add `pointer-events-auto` to ensure the content is interactive inside overlays.

#### 2. `src/components/order/DriverSelector.tsx`
Same fix — add `onWheel` with `stopPropagation()` on the `PopoverContent`.

#### 3. `src/components/ui/command.tsx`
Add `onWheel` with `stopPropagation()` directly on the `CommandList` component as a defensive measure, so any `CommandList` inside a scrollable parent works correctly.

#### 4. `src/components/order/DeliveryAddressStep.tsx`
Replace the old `Select` component (lines 165-176) with the new `TimeSlotSelector` component for consistency and to fix scrolling there too.

### Technical Detail

The key change in each file is adding an `onWheel` handler:

```tsx
// On PopoverContent or CommandList
onWheel={(e) => e.stopPropagation()}
```

This stops the wheel event from reaching the `DialogContent`'s scroll container, allowing the dropdown's own `overflow-y-auto` to handle scrolling correctly.

### Files Changed
- `src/components/order/TimeSlotSelector.tsx` — add `onWheel` stop propagation + `pointer-events-auto`
- `src/components/order/DriverSelector.tsx` — add `onWheel` stop propagation + `pointer-events-auto`
- `src/components/ui/command.tsx` — add `onWheel` stop propagation on `CommandList`
- `src/components/order/DeliveryAddressStep.tsx` — replace old `Select` with `TimeSlotSelector`

