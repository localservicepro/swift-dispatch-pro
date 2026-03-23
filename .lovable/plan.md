

## Plan: Replace Bulk Sync with Monthly Tab Auto-Sync

### What changes
- Remove the "Sync to Sheets" bulk button
- When Monthly Sync dialog is used, save the selected tab name to `google_sheets_settings` as the active sync tab
- New orders auto-sync to that saved monthly tab (instead of bulk-syncing all orders)
- The Monthly Sync dialog also does an initial full sync for the selected month

### Changes

**1. `supabase/functions/google-sheets-sync/index.ts`**
- In the `sync-single` action, read the `active_monthly_tab` from settings
- If set, sync the single order to that tab instead of the default sheet
- Keep the same header check, row find/update/append logic but target the monthly tab

**2. `src/components/order/MonthlySheetSyncDialog.tsx`**
- After successful monthly sync, save the tab name to `google_sheets_settings.active_monthly_tab`
- This makes it the "active" tab for auto-sync

**3. `src/components/order/MultiStepOrderForm.tsx`**
- Replace `syncAllOrdersToSheets()` with a `sync-single` call passing the new order ID
- The edge function will route it to the active monthly tab

**4. `src/components/order/OrderManagementHeader.tsx`**
- Remove the "Sync to Sheets" button and related state/imports
- Keep only the "Monthly Sync" button

**5. `src/utils/googleSheetsSync.ts`**
- Add `syncSingleOrderToSheets(orderId)` helper that calls `sync-single`
- Keep `syncMonthlyOrdersToSheets` as-is
- Remove `syncAllOrdersToSheets` (no longer needed)

**6. Database: add column to `google_sheets_settings`**
- Add `active_monthly_tab` text column to store the current tab name for auto-sync

### Flow
```text
User opens Monthly Sync → selects "March 2026" → syncs
  → saves "March 2026" as active_monthly_tab in settings

New order created
  → calls sync-single with order_id
  → edge function reads active_monthly_tab = "March 2026"
  → appends/updates row in "March 2026" tab

Next month: user opens Monthly Sync → selects "April 2026" → syncs
  → active_monthly_tab updates to "April 2026"
  → new orders now go to "April 2026" tab
```

### Files to modify
1. `supabase/functions/google-sheets-sync/index.ts` — sync-single uses active monthly tab
2. `src/components/order/MonthlySheetSyncDialog.tsx` — save active tab after sync
3. `src/components/order/MultiStepOrderForm.tsx` — use sync-single instead of bulk
4. `src/components/order/OrderManagementHeader.tsx` — remove Sync to Sheets button
5. `src/utils/googleSheetsSync.ts` — add syncSingleOrderToSheets, remove syncAllOrdersToSheets
6. New migration — add `active_monthly_tab` column to `google_sheets_settings`

