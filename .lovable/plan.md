

## Plan: Fix Google Sheets Auto-Sync for New Orders

### Root Cause
The edge function logs show the exact error:
```
Could not embed because more than one relationship was found for 'orders' and 'customers'
```

The `orders` table has two foreign keys to `customers` (`customer_id` and `storefront_customer_id`), so Supabase doesn't know which to use when the query says `.select('*, customers(company_name, business_name)')`.

### Fix

**File: `supabase/functions/google-sheets-sync/index.ts`**

Change the query from:
```
.select('*, customers(company_name, business_name)')
```
to:
```
.select('*, customers!orders_customer_id_fkey(company_name, business_name)')
```

This disambiguates the join so the fetch succeeds and auto-sync works.

### Files Modified
1. `supabase/functions/google-sheets-sync/index.ts` — disambiguate customers join (2 occurrences: in `sync-single` fetch and retry, and in `sync-bulk`)

