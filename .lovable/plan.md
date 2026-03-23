
## Plan: Make New Orders Auto-Sync to Google Sheets Reliably

### What’s actually wrong
Yes, auto-sync can be done. The current setup is fragile because **new-order sync depends on the browser’s real-time subscription inside `OrderManagementProvider`**.

That means:
- the sync only happens if that React provider is mounted and receives the INSERT event
- if the event is missed, nothing calls `google-sheets-sync`
- manual sync works because the edge function itself is fine
- delete sync can still appear to work because it is triggered through a different user flow and update event timing

So the main issue is **where the sync is triggered**, not whether Google Sheets sync is possible.

### Fix approach
Move the “new order” sync trigger to the **order creation path itself**, instead of relying only on front-end real-time.

### Changes
1. **`src/components/order/services/orderCreationService.ts`**
   - After a successful `createSingleOrder`, check `google_sheets_settings`
   - If sync is enabled and a spreadsheet is configured, immediately invoke:
     - `google-sheets-sync` with `action: 'sync-single'`
     - pass the newly created `order.id`
   - Keep it non-blocking for the user flow, but log failures clearly

2. **Handle split orders too**
   - In `createSplitOrder`, ensure all created orders are synced
   - Best approach:
     - either invoke `sync-single` for each created order id
     - or invoke one `sync-bulk` for the created group if that is easier with the returned data structure
   - This avoids split orders partially missing from Sheets

3. **Keep `OrderManagementProvider.tsx` real-time sync as a fallback**
   - Do not remove it yet
   - Let it remain for edits / external changes / backup sync behavior
   - But new-order creation should no longer depend on it

4. **Add stronger logging**
   - Log when order creation triggers a Google Sheets sync
   - Log order id / order number / sync enabled state
   - This makes future debugging much easier

### Why this will fix it
Right now:
```text
Create order
  -> save to DB
  -> hope browser realtime receives INSERT
  -> maybe call google-sheets-sync
```

Planned flow:
```text
Create order
  -> save to DB
  -> immediately call google-sheets-sync from order creation service
  -> sheet updates without needing manual button click
```

That makes creation sync behave much more like a guaranteed action instead of an optional listener side effect.

### Files to modify
- `src/components/order/services/orderCreationService.ts`
- possibly `src/components/order/OrderManagementProvider.tsx` (logging / keep fallback only)

### Expected result
- New single orders auto-sync to Google Sheets immediately
- Split orders also sync automatically
- Manual “Sync to Sheets” remains available as a bulk recovery tool
- Delete sync continues to work as it already does

### Validation
After implementation:
1. Create a normal order and confirm it appears in Google Sheets without clicking the manual button
2. Create a split order and confirm all related rows appear
3. Delete an order and confirm the row is removed
4. Check edge function logs if any sync call fails
