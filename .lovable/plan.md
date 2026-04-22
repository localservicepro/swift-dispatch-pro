

## Add server-side search to Opportunities pipeline (find historical orders)

### Problem

The Opportunities pipeline only loads **active orders + delivered orders from the last 30 days** (capped at 200 delivered). It's designed as an operational view, not a historical one. So when you search for an old account customer's order, it isn't in the cache and the client-side filter has nothing to match against.

The phone formatting itself already works correctly here — the existing client-side filter uses `phoneSearchMatch` which strips spaces from both sides. The issue is purely that the data isn't loaded.

### Solution

Keep the lean operational pipeline as the default, but **when the user actively types a search query, run an additional server-side query** that scans the entire `orders` table (not just the recent window) and merges any extra hits into the pipeline. This mirrors the Order Management server-side search pattern (and now uses the new phone variant helper added in the previous fix).

### Changes

**1. `src/components/opportunity/useOpportunitySearchData.ts` (new)**
- `useQuery` keyed on `['opportunity-search', debouncedSearchQuery]`.
- Disabled when search is empty.
- Builds the same `or(...)` as Order Management:
  - `order_number`, `customer_name`, `purchase_order`, `contact_name`, `delivery_address` (ILIKE)
  - phone columns ORed across `getPhoneSearchVariants(q)` when `isPhoneNumber(q)`
  - `customer_id.in.(...)` from a pre-search of `customers` (company/business/first/last name + phone variants)
- `.is('deleted_at', null)`, `.limit(200)`, same `PIPELINE_SELECT` and `mapOrder` so the shape matches.
- 300ms debounce via existing `useDebounce`.

**2. `src/components/OpportunityPipeline.tsx`**
- Call `useOpportunitySearchData(searchQuery)` alongside `useOpportunityData(dateFilter)`.
- Merge results into one array (dedupe by `id`, prefer the realtime-tracked copy from the pipeline cache when present).
- Keep the existing client-side `filteredOrders` filter unchanged — it will now operate over the merged set, so old orders surfaced by search show up in the correct pipeline columns.
- Add a small "Searching all orders…" indicator next to the search input while the search query is in flight.

### Result

- Default pipeline view stays fast and lean (no behavior change when you're not searching).
- Typing any name, phone (in any format), order number, or PO surfaces matching orders from across the entire history — including delivered jobs older than 30 days for long-time account customers.
- Phone formatting already works thanks to the variant helper added in the previous turn.

### Files

- New: `src/components/opportunity/useOpportunitySearchData.ts`
- Edited: `src/components/OpportunityPipeline.tsx`

