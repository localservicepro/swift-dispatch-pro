
## Plan: Reuse the Exact “Sync to Sheets” Trigger After Order Creation

### What’s happening now
The button and auto-sync are not using the same path:

- **Manual button** in `OrderManagementHeader.tsx` calls:
  - `google-sheets-sync` with `action: 'sync-bulk'`
  - and passes `filteredOrders`
- **New order creation** currently calls:
  - `google-sheets-sync` with `action: 'sync-single'`
  - from multiple places (`orderCreationService`, `MultiStepOrderForm`, and `OrderManagementProvider` fallback)

So manual sync works because it does a **full sheet rebuild**, while auto-sync tries to do a **single-row append/update** path that has been unreliable.

### Change to make
Make new-order auto-sync use the **same bulk sync flow as the button**.

### Implementation approach
1. **Create one shared client helper** for Google Sheets sync
   - Centralize the logic currently inside `handleSyncToSheets`
   - Support:
     - `syncAllOrdersToSheets(orders)`
     - optional silent/background mode for auto-sync
   - This avoids having different code paths for manual vs auto

2. **Trigger bulk sync after successful order creation**
   - In `MultiStepOrderForm.tsx`, after order creation succeeds and before/around refresh/close flow:
     - fetch the latest non-deleted orders list
     - invoke the shared bulk sync helper with that fresh list
   - Do this for both:
     - single orders
     - split orders

3. **Stop relying on `sync-single` for creation**
   - Remove new-order creation dependence on:
     - `orderCreationService.ts` auto `sync-single`
     - `MultiStepOrderForm.tsx` fallback `sync-single`
   - Keep real-time logic only as a fallback for updates/deletes if needed, but not as the primary creation sync path

4. **Keep the button behavior unchanged**
   - The visible “Sync to Sheets” button should keep using the same shared helper
   - Result: button click and new-order creation both hit the same `sync-bulk` behavior

### Why this should fix it
Right now:

```text
New order created
  -> tries sync-single
  -> sometimes misses / fails / diverges from button behavior
```

Planned:

```text
New order created
  -> fetch current orders
  -> run same bulk sync used by “Sync to Sheets” button
  -> sheet matches exactly what manual sync would produce
```

That means if the button works, auto-sync after creation should work the same way too.

### Files to update
- `src/components/order/OrderManagementHeader.tsx`
- `src/components/order/MultiStepOrderForm.tsx`
- `src/components/order/services/orderCreationService.ts`
- optionally `src/components/order/OrderManagementProvider.tsx` to reduce duplicate creation sync attempts

### Technical notes
- Prefer fetching fresh orders from DB before the bulk sync instead of using stale local state
- Keep bulk sync non-blocking or lightly handled so order creation still feels fast
- Show success/failure toast only for manual button clicks; background auto-sync should log errors quietly unless you want visible alerts

### Expected result
- Clicking **Sync to Sheets** and creating a new order both trigger the same full-sheet sync behavior
- New single orders and split orders appear in Google Sheets without needing manual sync
- Delete behavior can remain as-is since it already works

### Validation
1. Create a new normal order and confirm Sheets updates without pressing the button
2. Create a split order and confirm all rows appear
3. Press the manual button afterward and confirm it produces no unexpected differences
4. Check logs if bulk sync fails in the background
