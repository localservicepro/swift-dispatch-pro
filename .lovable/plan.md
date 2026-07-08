## Goal

Collapse split orders under their master in Order Management and the Opportunities pipeline so a 3-split order shows as **1 row** by default, not 4. Users can expand the master card to reveal the child splits inline.

## Behavior

- **Master orders** render as a single card with a badge `3 splits` and a chevron toggle. Combined totals (subtotal, delivery, total) shown on the collapsed card.
- **Expanded state** reveals the child split cards inline (indented, compact variant of `OrderCard`) — each still fully actionable (edit, delete, status update, receipt, payment).
- **Standalone splits** (child appearing without its master in the current page — e.g., filtered result) fall back to rendering individually with a small `Part of MO - ORD-xxx` link chip.
- **Filter/search behavior**: if a filter matches only some splits, the master is included and auto-expanded so matching children are visible.
- Regular (non-split) orders unchanged.
- Same grouping model applied to the Opportunities pipeline cards.

## Where it changes

Frontend/presentation only — no schema, no query shape changes beyond ensuring master + children are both in the fetched dataset (already true).

### Order Management
- `src/components/order/OrderList.tsx` — group orders via a new `groupOrdersBySplit()` helper before rendering: emit one entry per master (with its splits) plus ungrouped orders. Render `SplitOrderGroupCard` for groups, existing `OrderCard` for singletons.
- New `src/components/order/SplitOrderGroupCard.tsx` — collapsible wrapper: header row summarizes master (order number `MO - ORD-xxx`, customer, combined total, splits badge, aggregated status pill showing mixed statuses), body renders each child `OrderCard` in compact/indented mode when expanded. Auto-expand when any child matches active filter.
- New `src/components/order/utils/groupOrdersBySplit.ts` — pure function: `(orders) => { groups: {master, splits}[], singles: order[] }`. Handles the "child present but master missing on this page" edge case by emitting the child as a single with an orphan indicator.
- `src/components/order/OrderCard.tsx` — accept an optional `variant: 'default' | 'nested'` prop for the indented child rendering (smaller padding, subdued border, no duplicate customer block).

### Opportunities pipeline
- `src/components/opportunity/PipelineColumn.tsx` / `DroppablePipelineColumn.tsx` — apply the same `groupOrdersBySplit()` grouping so each column shows one card per master with expandable splits.
- New `src/components/opportunity/SplitOpportunityGroupCard.tsx` — collapsible equivalent for the pipeline card style. Drag behavior: dragging the master moves all splits together; dragging an expanded child moves just that split (matches current per-split status handling).
- `useOpportunityData` / `useOpportunitySearchData` — no changes to queries; grouping happens at render.

### Shared
- Persist expanded/collapsed state per master id in `sessionStorage` so navigating away and back keeps the view stable.
- Reuse `formatOrderNumber` (already prefixes `MO - `) for the group header.

## Out of scope

- No changes to how splits are created, invoiced, delivery fees calculated, or synced to Sheets/MYOB.
- No DB migrations.
- Reports/exports keep listing splits individually as today.

## Verification

1. Create a 3-split order → Order Management shows 1 collapsed card labeled `MO - ORD-xxx` with `3 splits` badge; expanding reveals 3 child cards.
2. Filter by status matching only split B → master auto-expands, splits A and C hidden or dimmed, split B highlighted.
3. Opportunities pipeline: same master appears once per column stage; if splits are in different stages, each appears once in its respective column (grouping only collapses within a column).
4. Regular (non-split) orders render exactly as before.
5. Actions on child splits (edit, status change, receipt, delete) still work from the expanded view.