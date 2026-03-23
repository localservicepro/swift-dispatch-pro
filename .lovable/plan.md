

## Plan: Fix Silent Failures in Google Sheets sync-single

### Diagnosis
The edge function logs confirm `sync-single` IS being called and reaching the `[sync-single] Targeting sheet tab: "March 2026"` log. No errors are logged. But the Google Sheets API responses (header check, row find, append/update) are **never checked or logged**. If the Sheets API returns an error (e.g., permission issue, quota exceeded, bad range), it fails silently.

### Fix
Add response checking and error logging for every Google Sheets API call in the `sync-single` action, then redeploy the edge function.

**File: `supabase/functions/google-sheets-sync/index.ts`**

In the `sync-single` block (lines ~210-260), after each `fetch` to the Sheets API:
1. Log the HTTP status and response body if not OK for:
   - Header check (`GET ...!A1:S1`)
   - Header write (`PUT ...!A1:S1`)
   - Column A fetch (`GET ...!A:A`)
   - Row update (`PUT ...!A{n}:S{n}`)
   - Row append (`POST ...!A:S:append`)
2. Add a success log at the end: `[sync-single] Successfully synced order {order_number} to tab "{targetSheet}"`

This will reveal what's actually failing in the Sheets API interaction.

### Redeploy
After updating the code, redeploy the `google-sheets-sync` edge function.

### Files Modified
1. `supabase/functions/google-sheets-sync/index.ts` — add Sheets API response logging in sync-single

