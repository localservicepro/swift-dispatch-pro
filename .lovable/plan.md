## Goal

In both **Opportunities** and **Order Management**, the master (MO) order must render as a full, normal card — identical to any other order — with a compact toggle strip directly below it that expands/collapses the child splits.

The current `SplitOpportunityGroupCard.tsx` and `SplitOrderGroupCard.tsx` files already implement this pattern, but your screenshots still show the old slim-header layout. This plan verifies the current implementation is reaching the screen and closes any remaining gap.

## Changes

### 1. Opportunities pipeline — `src/components/opportunity/SplitOpportunityGroupCard.tsx`

Confirm and (re)enforce:

- The master renders as `<OpportunityCard order={master} .../>` — same visual as every other pipeline card (customer info, address, delivery schedule, products, total, action button, notes, click-to-open).
- Directly below the master, render a compact strip:
  - `Split` icon + `N splits` badge + "Show / Hide split orders" label
  - Combined total (`Combined: $XYZ`) on the right
  - Chevron toggle (▶ / ▼)
- On expand: render child splits below the strip as `DraggableOpportunityCard` (in the draggable columns) or `OpportunityCard` (non-draggable contexts), inside a container with `pl-3 border-l-2 border-dashed border-slate-300 ml-2`.
- Master card itself is NOT draggable; child splits remain individually draggable.
- Expanded state persists per `masterId:stage` in `sessionStorage`.

### 2. Order Management — `src/components/order/SplitOrderGroupCard.tsx`

Confirm and (re)enforce:

- The master renders as `<OrderCard order={master} .../>` (default variant) — full order details: order number, status pill, payment status, customer block, products, driver, delivery suburb, action buttons (Edit / Print Receipt / Cancel / Delete).
- Directly below the master, render the same compact strip:
  - `Split` icon + `N splits` badge + "Show / Hide split orders" + `Combined: $XYZ` + chevron toggle.
- On expand: child splits render as `<OrderCard variant="nested" .../>` inside a `pl-4 border-l-2 border-dashed border-slate-300 ml-2` container.
- `forceExpanded` (when a filter/search is active) auto-opens the group.
- Expanded state persists per masterId in `sessionStorage`.

### 3. Verification (must be done before finishing)

- Reload Opportunities and Order Management with the split MO in view.
- Confirm the master card visually matches a normal (non-split) card — same padding, header, customer block, total, and action row.
- Confirm the splits strip sits directly under the master with combined total + toggle.
- Toggling shows/hides child cards with the dashed left border indent.
- Non-split orders look unchanged.
- Drag-and-drop still works on child splits only (master is not draggable).

### 4. Out of scope

- No changes to grouping utility (`groupOrdersBySplit.ts`), data fetching, statuses, totals, backend, or business logic.
- Orphan splits (master missing) are unchanged.
