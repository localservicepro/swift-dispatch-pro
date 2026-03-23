

## Plan: Fix Missing Company Names in Google Sheets

### Root Cause
The client-side `syncAllOrdersToSheets()` fetches orders with `.select('*')` and passes them to the edge function. Since `company_name` and `business_name` live on the `customers` table (not `orders`), these fields are always empty.

The edge function already has a fallback: when **no orders are passed**, it fetches them server-side with the proper customer join. But because the client always passes orders, that fallback never runs.

### Fix
Stop passing orders from the client. Let the edge function fetch them server-side with the customer join it already has.

**File: `src/utils/googleSheetsSync.ts`**
- Remove the client-side orders fetch
- Invoke the edge function with just `{ action: 'sync-bulk' }` (no orders payload)
- The edge function's existing code at line 246-258 will handle fetching orders with `customers!orders_customer_id_fkey(company_name, business_name)`

This is a one-line change that fixes the company column for all sync paths (manual button and auto-sync after order creation).

### Files Modified
1. `src/utils/googleSheetsSync.ts` — remove client-side fetch, pass no orders

