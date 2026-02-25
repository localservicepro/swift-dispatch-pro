

## Replace Scroll Arrows with Native Scrolling in Select Dropdowns

The current Radix `SelectContent` component uses `SelectScrollUpButton` and `SelectScrollDownButton` (the up/down chevron arrows) for navigation. The user wants standard native scrolling instead.

### Changes

#### `src/components/ui/select.tsx`
- Remove `<SelectScrollUpButton />` and `<SelectScrollDownButton />` from inside `SelectContent`
- Change `overflow-hidden` to `overflow-auto` on the `SelectPrimitive.Content` so the dropdown scrolls natively
- Alternatively, add `overflow-y-auto max-h-[300px]` to the `Viewport` to enable smooth scroll within the popover

This is a single-file change to the shared UI component. All Select dropdowns (delivery time, driver, pickup time, etc.) will automatically inherit the native scroll behavior.

### Technical Detail
The Radix Select `position="popper"` mode already constrains the dropdown height via `max-h-96`. By removing the scroll buttons and switching to `overflow-auto` on the viewport, the browser's native scrollbar appears instead of the arrow buttons.

### Files Changed
- `src/components/ui/select.tsx`

