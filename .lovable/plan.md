

## Plan: Delete Orders from Google Sheets on Soft Delete

### Overview
When an order is soft-deleted, also remove its row from the Google Sheet (if sync is enabled). Add a `delete-single` action to the `google-sheets-sync` edge function and call it from the client after successful deletion.

### Changes

**1. `supabase/functions/google-sheets-sync/index.ts`** — Add `delete-single` action
- Accepts `order_number` parameter
- Reads all values from column A to find the row with that order number
- Deletes that row using the Sheets `batchUpdate` API (`deleteDimension` request)

**2. `src/components/order/hooks/useOrderActions.ts`** — After successful soft delete, call the edge function
- After `soft_delete_order` RPC succeeds, check if Google Sheets sync is enabled
- If enabled, invoke `google-sheets-sync` with `action: 'delete-single'` and the order number
- Fire-and-forget (don't block on it, just log errors)
- Same for group deletion — delete each order number in the group

**3. `src/components/order/OrderManagementProvider.tsx`** — Handle DELETE via real-time
- The existing real-time subscription listens for `UPDATE` events (soft delete is an UPDATE setting `deleted_at`)
- Add logic: if `payload.new.deleted_at` is set and `payload.old.deleted_at` was null, trigger delete from Google Sheets
- This serves as a fallback for deletions from other places (e.g., opportunity pipeline)

### How the Sheet Delete Works
```text
1. Fetch column A values from sheet
2. Find row index where value matches order_number
3. Use batchUpdate deleteDimension to remove that row
```

### Files Modified
1. `supabase/functions/google-sheets-sync/index.ts` — add `delete-single` action
2. `src/components/order/OrderManagementProvider.tsx` — trigger sheet delete on soft-delete detection via real-time

