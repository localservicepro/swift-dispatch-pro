

## Optimize Opportunities Pipeline (Performance + Smooth Drag)

### Root Causes
The pipeline fetches **all 5,133 active orders** (5,092 are `delivered`) on every load, with heavy joins. There's no DB-level date filtering, no pagination, no optimistic UI on drag, and cache invalidation triggers a full refetch — so dropped cards visibly snap back.

### Fix Strategy

**1. Server-side date filter + cap delivered orders (biggest win)**
- Push the `dateFilter` ("today", "week", "month", "all") into the Supabase query.
- For `"all"`, still cap `delivered` orders to the last 30 days (or last 200) — the pipeline doesn't need 5,000 historical delivered cards. Active stages (on_hold, requested, preparing, loading, en_route) stay unbounded.
- Refetch only when `dateFilter` changes (include it in the query key).
- Expected: 5,133 → ~200–400 rows on "All Time", much less on Today/Week.

**2. Optimistic drag-and-drop update**
- On `handleDragEnd`, immediately update React Query cache (`setQueryData`) to move the card to the new stage before the DB call returns.
- If the DB update fails, roll back the cache and toast the error.
- Remove the post-update `invalidateOrdersCache` call for drag moves — the optimistic update is the source of truth, and realtime will reconcile if needed.
- Result: card stays in dropped column instantly, no snap-back, no freeze.

**3. Lighter realtime subscription**
- Subscribe only to `UPDATE` and `INSERT` events (drop wildcard `*`), and only patch the affected order in cache via `setQueryData` instead of invalidating.
- Skip self-triggered updates (we already applied them optimistically) by comparing `updated_at` or using a short-lived "recently moved by me" set.
- Reduce toast spam — only toast for changes coming from other users.

**4. Trim the query payload**
- Drop fields the pipeline cards don't render (e.g. `customer_address`, `special_instructions`, full `delivered_status` array — we only need the latest timestamp).
- Replace `delivered_status:delivery_status_updates(...)` with a single `delivered_at` column read from the order if available, or limit to 1 row.

**5. Memoize heavier work**
- `ordersByStage` already uses `useMemo` — keep. Ensure `filteredOrders` dependencies are stable.
- Move the per-card phone/text search into the DB query when `searchQuery` is set (mirroring `useOrderData.ts` pattern), so we don't filter 5k rows in JS.

### Files to Modify
- `src/components/opportunity/useOpportunityData.ts` — server-side date filter, delivered cap, lighter select, smarter realtime, optimistic-update helpers.
- `src/components/OpportunityPipeline.tsx` — pass `dateFilter` into the hook, implement optimistic cache update in `handleDragEnd` / `handleAssignmentComplete`, remove blanket `invalidateOrdersCache` after drag.

### Expected Result
- "All Time" loads in well under a second instead of freezing.
- Dragging a card to a new stage feels instant and stays put.
- Realtime updates from other users still appear, but no longer trigger full refetches.
- No DB schema changes required.

