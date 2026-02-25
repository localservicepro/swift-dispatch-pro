

## Fix: Add Scroll Buttons to Select Dropdowns

The screenshot shows the dropdown displays items but has no visible scroll indicators. The `SelectContent` component is missing the `SelectScrollUpButton` and `SelectScrollDownButton` components that Radix UI uses to provide visible scroll affordance.

### Root Cause
The `SelectContent` wrapper doesn't include the `ScrollUpButton` and `ScrollDownButton` children. While `overflow-y-auto` allows native scrolling, Radix Select is designed to use these dedicated scroll buttons for better UX and visibility. Additionally, the outer Content element has `overflow-auto` which may conflict with the Viewport's scrolling.

### Changes

#### `src/components/ui/select.tsx`
1. **Add `SelectScrollUpButton` before the Viewport** and **`SelectScrollDownButton` after the Viewport** inside `SelectContent` — these render chevron arrows at the top/bottom when there are more items to scroll to.
2. **Change outer Content from `overflow-auto`** to `overflow-hidden` so only the Viewport handles scrolling, preventing double-scrollbar conflicts.

The updated `SelectContent` will look like:
```tsx
<SelectPrimitive.Content ... className="... overflow-hidden ...">
  <SelectScrollUpButton />
  <SelectPrimitive.Viewport ...>
    {children}
  </SelectPrimitive.Viewport>
  <SelectScrollDownButton />
</SelectPrimitive.Content>
```

This adds visible up/down chevron indicators when items overflow, making it clear the list is scrollable.

### Files Changed
- `src/components/ui/select.tsx`

