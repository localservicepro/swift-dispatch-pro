

## Plan: Monthly Google Sheets Sync with Tab Selection Dialog

### What you'll get
A dialog that lets you pick a month/year and a sheet tab name, then syncs only that month's orders to that specific tab in Google Sheets. This way each month gets its own tab (like "March 2026", "April 2026" in your screenshot).

### Changes

**1. Create `src/components/order/MonthlySheetSyncDialog.tsx`**
- Dialog with:
  - Month/year picker (dropdown selectors for month and year)
  - Sheet tab name input (auto-populated as "Month Year", e.g. "March 2026", editable)
  - Sync button
- On submit: calls `syncMonthlyOrdersToSheets(year, month, tabName)`

**2. Update `src/utils/googleSheetsSync.ts`**
- Add `syncMonthlyOrdersToSheets(year, month, sheetTabName, silent)` function
- Invokes edge function with `action: 'sync-monthly'`, passing `year`, `month`, and `sheet_name` override

**3. Update `supabase/functions/google-sheets-sync/index.ts`**
- Add `sync-monthly` action:
  - Accepts `year`, `month`, `sheet_name` parameters
  - Filters orders by `created_at` within that month range
  - Uses the provided `sheet_name` instead of the default tab
  - Creates the tab if it doesn't exist (via Sheets API `addSheet` request)
  - Clears and writes header + filtered orders to that tab

**4. Update `src/components/order/OrderManagementHeader.tsx`**
- Add a button or dropdown option to open the monthly sync dialog
- Keep existing "Sync to Sheets" button for full sync

### How it works
```text
User clicks "Monthly Sync" → Dialog opens
  → Select month: March 2026
  → Tab name auto-fills: "March 2026" (editable)
  → Click Sync
  → Edge function filters orders WHERE created_at in March 2026
  → Creates/clears "March 2026" tab in spreadsheet
  → Writes filtered orders to that tab
```

### Files to create/modify
1. `src/components/order/MonthlySheetSyncDialog.tsx` (new)
2. `src/utils/googleSheetsSync.ts` (add monthly helper)
3. `supabase/functions/google-sheets-sync/index.ts` (add `sync-monthly` action)
4. `src/components/order/OrderManagementHeader.tsx` (add dialog trigger)

