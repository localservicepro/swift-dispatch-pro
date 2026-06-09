# Fix floating cart button position

## Problem
The floating cart button in `StorefrontProductBrowser` uses `fixed bottom-6 right-6`, but it currently appears at the top of the products area overlapping the search bar instead of pinned to the bottom-right of the viewport.

Cause: an ancestor element (likely the sticky/backdrop-blur header chain or a transformed parent above the storefront content) is creating a containing block for `position: fixed`, so `bottom-6` is measured against that ancestor rather than the viewport.

## Fix
In `src/components/storefront/StorefrontProductBrowser.tsx`:

1. Import `createPortal` from `react-dom`.
2. Decouple the trigger from `SheetTrigger asChild` — render the `<Sheet>` with `open`/`onOpenChange` only, and render the floating button separately via `createPortal(..., document.body)` so no ancestor can become its containing block.
3. Keep classes `fixed bottom-6 right-6 z-50` plus mobile safe-area padding (`pb-[env(safe-area-inset-bottom)]` wrapper) so it sits cleanly above the viewport bottom on iOS.
4. Button `onClick` sets `setCartOpen(true)`; the Sheet still opens as before.
5. Guard the portal with a `typeof document !== "undefined"` check to stay SSR-safe.

No other files change. Cart logic, drawer contents, styling, and behavior remain identical.

## Acceptance
- On `/storefront` (and inside any dialog/scroll context), the cart pill sits at the bottom-right of the browser viewport, not overlapping the search bar.
- Clicking it still opens the cart Sheet.
- Works on mobile without being clipped by the home indicator area.
