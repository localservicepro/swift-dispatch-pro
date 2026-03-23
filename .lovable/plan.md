

## Plan: Fix Google Sheets Auto-Sync for New Orders

### Root Cause
The edge function's `sync-single` action fetches the order using `.single()`, which throws on errors rather than returning null gracefully. When the query fails (e.g., timing, join issues), `orderData` stays undefined and the function throws "No order data provided." There's no error logging on the fetch itself, so failures are silent.

### Fix

**File: `supabase/functions/google-sheets-sync/index.ts`** (lines 147-165)

1. Replace `.single()` with `.maybeSingle()` to avoid throwing on edge cases
2. Add error logging for the fetch query so we can see why it fails
3. Add a small retry with delay (1 second) for INSERT events — the real-time event may fire before the transaction is fully visible to the service role client

```text
sync-single flow (fixed):
  1. Receive order_id
  2. Wait 1s (gives DB time to commit)
  3. Fetch order with .maybeSingle()
  4. Log any fetch errors
  5. If still no data, retry once after another 1s
  6. Proceed with sync or return graceful error
```

### Files Modified
1. `supabase/functions/google-sheets-sync/index.ts` — improve fetch resilience and add logging

