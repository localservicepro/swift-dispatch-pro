

## Add Light/Dark Mode Toggle

### Overview

The design system already defines both light and dark color tokens in `src/index.css` (`:root` and `.dark`), and Tailwind is configured with `darkMode: ["class"]`. The `next-themes` package is already installed but never wired up. We just need to add the provider, persist the choice, and expose a toggle in the header.

### What you'll see

- A sun/moon icon button in the desktop header (next to the Guide and Sign Out buttons) and in the mobile header.
- Clicking it cycles Light → Dark (with a small dropdown for Light / Dark / System).
- The choice is remembered across reloads and tabs (localStorage via `next-themes`).
- No flash of wrong theme on first paint.

### Implementation

1. **ThemeProvider wrapper** — new `src/components/theme/ThemeProvider.tsx` re-exporting `next-themes`'s provider configured with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`.

2. **Mount provider** — wrap the tree in `src/App.tsx` (inside `QueryClientProvider`, outside `AuthProvider`) so every route (admin, driver portal, customer portal, storefront) gets the theme class on `<html>`.

3. **Anti-flash script** — add a tiny inline script in `index.html` `<head>` that reads `localStorage.theme` and applies `dark` class to `<html>` before React mounts.

4. **ThemeToggle component** — new `src/components/theme/ThemeToggle.tsx`: a `DropdownMenu` triggered by a Sun/Moon icon Button (icons swap based on resolved theme, using existing `lucide-react` icons). Options: Light, Dark, System. Uses `useTheme()` from `next-themes`.

5. **Wire into headers**:
   - `src/pages/Index.tsx` — add `<ThemeToggle />` next to the Guide tooltip button in the desktop header.
   - `src/components/MobileHeader.tsx` — add `<ThemeToggle />` to the mobile header actions row.
   - `src/pages/SwiftDispatchGuide.tsx` and other top-level pages with their own headers (driver portal, customer portal) — optional follow-up; the global provider already themes them, only the toggle button needs to be placed where users expect it. Plan: add the toggle to admin headers (desktop + mobile) and the driver/customer portal top bars so all logged-in surfaces can switch.

6. **Sonner already reads theme** — `src/components/ui/sonner.tsx` already calls `useTheme()`, so toasts will follow automatically.

### Out of scope (intentionally)

- No design changes to dark token values — the existing `.dark` palette in `index.css` is used as-is.
- No per-component dark mode audit. If specific screens look off in dark mode, those are separate fix-ups.

### Files

- New: `src/components/theme/ThemeProvider.tsx`
- New: `src/components/theme/ThemeToggle.tsx`
- Edited: `src/App.tsx` (mount provider)
- Edited: `index.html` (anti-flash script)
- Edited: `src/pages/Index.tsx` (toggle in desktop header)
- Edited: `src/components/MobileHeader.tsx` (toggle in mobile header)
- Edited: `src/pages/DriverPortal.tsx` and `src/pages/CustomerPortal.tsx` (toggle in their top bars)

