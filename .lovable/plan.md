
User shows ORD-466121JT in Order Management with status `requested` and scheduled delivery 2026-04-23. They're asking why it doesn't show in Opportunities.

Looking at `useOpportunityData.ts` we just changed:

```ts
function getCreatedAfter(dateFilter): Date | null {
  case "today": today 00:00
  case "week": now - 7 days
  case "month": now - 1 month
  case "all": null
}

// Active stages query:
let activeQuery = supabase.from('orders')...neq('status', 'delivered')...
if (createdAfter) {
  activeQuery = activeQuery.gte('created_at', createdAfter.toISOString());
}
```

The order was **created 4/18/2026** (today per screenshot — "Good morning, Jay 8:16 AM"). But the **delivery date is 2026-04-23** (5 days out).

Wait — the filter is on `created_at`, not `delivery_date`. So if filter is "Today", it filters orders created today. ORD-466121JT was created 4/18/2026 which IS today. It should show.

But user says it doesn't. Let me re-check... actually the user might have filter set to "Today" and the order created today should appear. Unless... the issue is different.

Hmm wait — looking more carefully. The active query has no limit. The delivered cap is 200. Active orders should all return. Let me think about what could exclude this order.

Possibility: The order has `master_order_id` set or `is_split_order` true and the pipeline filters those out somewhere. Let me check OpportunityPipeline.

Actually, more likely culprit: the active query includes ALL non-delivered orders without date filter when "all", but with a date filter the `created_at >= cutoff` excludes anything created before. ORD-466121JT created today (4/18/2026), filter "Today" cutoff = today 00:00 → should pass.

Could be: the user has filter set to something else, OR the pipeline filters by `is_split_order` / master orders, OR there's a customer-type filter excluding it.

I should investigate by reading OpportunityPipeline.tsx to see all filters applied.

Plan: investigate, fix.

## Plan: Diagnose Missing Order in Opportunities Pipeline

### Investigation
The order `ORD-466121JT` is `requested` status, created today, delivery 2026-04-23, but doesn't show on `/opportunities`. Need to check:

1. **`OpportunityPipeline.tsx`** — review all client-side filters applied after fetch:
   - Customer-type checkbox filters (Account/Trade/Residential)
   - Search query filter
   - Any split-order / master-order exclusions
   - Stage mapping (does `requested` map to a visible column?)

2. **`useOpportunityData.ts`** — confirm the active-orders query actually returns this order:
   - Check `dateFilter` cutoff against `created_at = 2026-04-18`
   - Confirm no `master_order_id` / `is_split_order` exclusion in the SELECT
   - Verify the order isn't soft-deleted (`deleted_at IS NULL`)

3. **Check the customer record** — `Test Company 1232` may have a `customer_type` that's being filtered out, or no customer_type at all (null) which the type-checkbox filter might drop.

### Likely Causes (ranked)
1. **Customer type filter is hiding it** — the customer-type checkboxes default to specific types; if `Test Company 1232` has `customer_type` null or not in the checked list, it gets filtered out client-side.
2. **Date filter mismatch** — pipeline filter set to something narrower than "Today/All Time" while user expects to see it.
3. **Stage column mapping** — `requested` status not mapped to a visible pipeline stage.

### Fix Approach
- Read `OpportunityPipeline.tsx` to identify the filter logic.
- Query the DB for this specific order to verify its `customer_type`, `status`, `master_order_id`, `is_split_order`, and `deleted_at`.
- Based on findings:
  - If customer-type filter is the cause: either default-include customers with null `customer_type`, or surface a clear "X orders hidden by filter" indicator with a one-click reset.
  - If date filter: ensure the active-stages query ignores `dateFilter` for active work (already the intent — verify it's working).
  - If stage mapping: add the missing status to the appropriate column.

### Files to Modify (likely)
- `src/components/OpportunityPipeline.tsx` — adjust client-side filter so orders with null/unknown `customer_type` aren't silently hidden.
- Possibly `src/components/opportunity/useOpportunityData.ts` if a query condition is excluding the row.

### Verification
- Reload `/opportunities` with default filters and confirm `ORD-466121JT` appears in the `Requested` column.
- Toggle customer-type checkboxes and confirm orders with unknown type still appear when "all" is effectively selected.
