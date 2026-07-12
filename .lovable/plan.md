## Goal
Make split order groups in Order Management load with their child splits hidden, so users can click to reveal them instead of seeing them expanded on first load.

## Background
`SplitOrderGroupCard` already defaults to `expanded = false` (stored state falls back to `false`), but `OrderList.tsx` passes `forceExpanded={hasActiveFilters}`. That means any active filter or search query forces every split group to expand, which is the current behavior the user is seeing.

## Plan
1. Update `src/components/order/OrderList.tsx` to stop forcing split groups open when filters are active.
   - Remove the `forceExpanded={hasActiveFilters}` prop from the `<SplitOrderGroupCard />` invocation.
   - Keep the grouping and master card rendering unchanged.
2. Preserve existing sessionStorage behavior in `SplitOrderGroupCard` so that once a user expands a group it stays expanded during the session.
3. Optionally clean up the now-unused `forceExpanded` prop in `SplitOrderGroupCard` if no other component passes it.

## Result
Split groups will render as a single master card plus the amber "SPLIT ORDER" reveal banner. Splits will only appear after the user clicks the banner, regardless of whether search filters are active.