
User wants ability to collapse the AdminSidebar on the Opportunities page (and presumably elsewhere) to maximize viewing space for the pipeline.

Looking at the codebase, AdminSidebar is the left navigation. Let me check if it uses the shadcn sidebar component which has built-in collapse support.

The shadcn `ui/sidebar.tsx` exists, so likely AdminSidebar uses `SidebarProvider` and supports collapse via `SidebarTrigger`. I'll plan to add a collapse toggle button.

## Plan: Collapsible Sidebar for More Pipeline Space

### Change
Add a collapse/expand toggle for the left navigation sidebar so users can reclaim horizontal space on the Opportunities page (and across the admin app).

### Implementation
1. **`src/components/AdminSidebar.tsx`**
   - Ensure the sidebar uses `collapsible="icon"` mode (shadcn pattern) so it shrinks to a narrow icon-only rail instead of disappearing entirely.
   - When collapsed: show only the menu icons (Dashboard, Opportunities, Orders, etc.) with tooltips on hover.
   - When expanded: show full labels as today.

2. **Add a toggle button**
   - Place a `SidebarTrigger` (chevron icon) at the top of the sidebar header, next to the "SwiftDispatch Pro" logo.
   - Also surface it in the page header area so it's discoverable from the Opportunities view.
   - Clicking toggles between expanded and collapsed states.

3. **Persist user preference**
   - Store collapsed/expanded state in `localStorage` (key: `sidebar-collapsed`) so it remembers the choice across page reloads and navigation.

4. **Responsive behavior**
   - Desktop: toggle between full (expanded) and icon-rail (collapsed).
   - Mobile: unchanged — `MobileBottomNav` already handles small screens.

### Files Modified
- `src/components/AdminSidebar.tsx` — enable `collapsible="icon"`, add trigger, persist state.
- Possibly `src/pages/Index.tsx` or the Opportunities layout wrapper — to ensure `SidebarProvider` wraps the layout if not already.

### Result
Users on `/opportunities` (and any admin page) can click a chevron to collapse the left nav into a thin icon rail, giving the pipeline columns roughly 200px more horizontal space. Click again to expand.
