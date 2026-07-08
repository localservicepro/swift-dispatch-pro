## Goal

Make the collapsed split-group look like a real order card (not a slim header). Show the master order rendered as a normal card, with the splits count/expand affordance layered on top, and the child splits appearing nested below only when expanded.

## Changes

### 1. Opportunities pipeline — `SplitOpportunityGroupCard.tsx`

Replace the current minimal header with:

- Render the **master order** using the existing `OpportunityCard` (non-draggable) as the always-visible top card, so it looks identical to any other order card in the column (customer info, address, total, status colors, action button).
- Overlay a compact "splits" strip directly under the master card:
  - `Split` icon + `N splits` badge + combined total (e.g. `Combined: $382`)
  - Chevron toggle (▶ / ▼) to expand
- When expanded, render the child splits below the master, indented with the existing dashed left border, using `OpportunityCard` / `DraggableOpportunityCard` as today.
- Keep the per-master + per-stage `sessionStorage` expanded state.
- Master card itself is not draggable (children are), matching current split semantics.

### 2. Order Management — `SplitOrderGroupCard.tsx`

Same treatment:

- Render the **master** using the existing `OrderCard` (default variant) as the visible card.
- Below it, a compact bar: `Split` icon, `N splits` badge, combined total, mixed/all-same status pill, chevron toggle.
- Expanded state renders child splits as `OrderCard variant="nested"` inside a dashed-border container (unchanged from today).
- Keep sessionStorage expansion, `forceExpanded` behaviour for filter matches.

### 3. No other changes

- No changes to data fetching, grouping utility (`groupOrdersBySplit.ts`), drag-and-drop, statuses, totals, or any business logic.
- Regular (non-split) orders unchanged.
- Orphan splits unchanged.

## Verification

- 2-split MO renders as a full master card with a splits bar below; expanding reveals 2 nested split cards.
- Combined total on the strip matches master + splits.
- Non-split orders visually unchanged.
- Drag still works on child splits only.
