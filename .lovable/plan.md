
The user filters by Today/Week/Month and sees the order, but on "All Time" it disappears. Looking at `useOpportunityData.ts`:

- Active query: `neq('status', 'delivered')` + `gte('created_at', createdAfter)` only when filter is not "all". So All Time should return MORE orders, not fewer.
- BUT: Supabase has a **default 1000 row limit per query**. There are ~5000+ orders in the system. On "All Time" the active query fetches without date filter and gets capped at 1000 rows by Supabase — likely the 1000 most recent by `created_at DESC`. ORD-466121JT was created today so it should be in the top 1000... unless it's not.

Wait — the order is on the `requested` stage. The active query orders by `created_at DESC` and takes the top 1000. ORD-466121JT created today (2026-04-18) should be at the very top. So why missing?

Let me reconsider. Actually the `.order('created_at', { ascending: false })` followed by Supabase's implicit 1000 cap means the 1000 most recent active (non-delivered) orders. If there are >1000 active orders, older ones get dropped — but today's order would be IN the result.

Hmm. Then maybe the issue is on Today/Week/Month, the query has `.gte('created_at', cutoff)` which returns fewer rows, all under 1000, so everything shows. On All Time, the result hits 1000 cap and the order is included BUT something downstream filters it out.

Actually wait — I missed something. Let me re-read: combined = active + delivered. If active returns 1000 and delivered returns 200, total 1200. That's fine. The order should appear.

Possible cause: the customer-type filter in `OpportunityPipeline.tsx` defaults to certain types, and perhaps there's logic that depends on dataset behavior. But filter is consistent across date ranges, so that's unlikely the cause.

More likely: **Supabase 1000-row cap silently drops the order.** On Today filter, only ~10-50 orders return → all visible. On All Time, 1000 cap hits — and `created_at DESC` should put the newest first BUT if there are 1000+ active non-delivered orders (very plausible given 5000 total) AND the order was created today, it should still be in top 1000.

UNLESS: there's another active query that hits the cap differently, or the combined+sorted result has 1200 items but pipeline rendering does pagination.

Best path: query DB to verify counts, then add explicit `.range()` / higher limit / pagination. Most likely fix: explicitly set `.limit(2000)` on active query and confirm.

Need to investigate live data before finalizing.

## Plan: Fix Missing Orders on "All Time" Filter

### Root Cause (suspected)
Supabase enforces a default **1000-row cap per query**. On Today/Week/Month, the date filter keeps results well under 1000 so everything renders. On **All Time**, the active-orders query (`status != 'delivered'`) likely returns more than 1000 rows, gets silently truncated, and some orders — including newly created ones in less common stages — drop out of the response.

### Investigation (during implementation)
1. Query the DB to count active (non-delivered, non-soft-deleted) orders. If > 1000, the cap is the cause.
2. Confirm `ORD-466121JT` is in the active set with `status='requested'`, `deleted_at IS NULL`.

### Fix
In `src/components/opportunity/useOpportunityData.ts`:

1. **Add explicit limits to both queries** so Supabase doesn't silently truncate:
   - Active query: `.limit(2000)` (well above expected active workload but bounded for performance).
   - Delivered query: keep existing `.limit(200)` cap.

2. **Tighten the All Time active fetch** to mirror the operational intent: only the most recent active orders matter. Cap to e.g. last 90 days OR latest 2000 rows ordered by `created_at DESC` — whichever the data supports. The pipeline is operational, not historical.

3. **Add a dev-only console warning** when the active query returns exactly the cap — helps catch this regression in future.

### Files Modified
- `src/components/opportunity/useOpportunityData.ts`

### Verification
- Reload `/opportunities` with **All Time** filter → confirm `ORD-466121JT` appears in the Requested column.
- Toggle between Today / Week / Month / All Time → order remains visible in all views.
- Check console for any "result hit cap" warnings.
