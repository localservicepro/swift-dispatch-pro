

## Plan: Google Sheets Order Sync Integration

### Overview
Connect orders to Google Sheets with both auto-sync (on create/update) and a manual export button. Uses Google Sheets API via a service account — no OAuth flow needed for server-to-server access.

### How It Works

1. **Service Account**: You'll create a Google Cloud service account, share your spreadsheet with it, and add the credentials as a secret
2. **Auto-sync**: A new edge function `google-sheets-sync` pushes order data to a Google Sheet whenever an order is created or updated (called from the existing real-time subscription)
3. **Manual export**: A button in Order Management lets you export all filtered orders to the sheet on demand

### Setup Required (by you)
1. Go to Google Cloud Console → Create a project (or use existing)
2. Enable the **Google Sheets API**
3. Create a **Service Account** → Download the JSON key file
4. Create a Google Sheet → Share it with the service account email (Editor access)
5. Copy the Spreadsheet ID from the URL

### Database Changes

**New table: `google_sheets_settings`**
- `spreadsheet_id` (text) — the Google Sheets spreadsheet ID
- `sheet_name` (text, default 'Orders') — tab name
- `service_account_email` (text) — for display/reference
- `connection_status` (text, default 'not_configured')
- `last_synced_at` (timestamptz)
- `sync_enabled` (boolean, default true) — toggle auto-sync
- RLS: admin-only

### Edge Function

**`google-sheets-sync/index.ts`**
- Actions: `sync-single` (one order), `sync-bulk` (all/filtered orders), `test-connection`
- Uses Google Sheets API v4 with service account JWT auth
- Reads `GOOGLE_SERVICE_ACCOUNT_KEY` secret (the JSON key contents)
- Reads spreadsheet ID from `google_sheets_settings` table
- Creates header row if sheet is empty
- For single sync: finds existing row by order number and updates, or appends
- For bulk: clears sheet and writes all orders
- Columns: Order #, PO, Date, Customer, Company, Phone, Address, Products, Subtotal, Delivery Fee, Total, Payment Method, Payment Status, Order Status, Driver, Truck, Delivery Date, Delivery Time, Notes

### UI Changes

**1. `src/components/settings/GoogleSheetsSettings.tsx`** (new)
- Spreadsheet ID input
- Sheet name input
- Auto-sync toggle
- Test connection button
- Last synced timestamp
- Connection status badge

**2. `src/components/Settings.tsx`** — Add Google Sheets settings card below MYOB

**3. `src/components/OrderManagement.tsx`** — Add "Sync to Google Sheets" button in header area
- Syncs currently filtered orders to the sheet
- Shows loading state and success/error toast

**4. Auto-sync trigger** in `src/components/order/OrderManagementProvider.tsx`
- In the existing real-time subscription, after receiving INSERT/UPDATE, call the edge function to sync that order to Google Sheets (if enabled)

### Files Created
1. Database migration — `google_sheets_settings` table
2. `supabase/functions/google-sheets-sync/index.ts`
3. `src/components/settings/GoogleSheetsSettings.tsx`

### Files Modified
1. `src/components/Settings.tsx` — add Google Sheets section
2. `src/components/OrderManagement.tsx` — add sync button
3. `src/components/order/OrderManagementProvider.tsx` — auto-sync on real-time events
4. `supabase/config.toml` — add function config

### Secret Required
- `GOOGLE_SERVICE_ACCOUNT_KEY` — the full JSON contents of the service account key file

