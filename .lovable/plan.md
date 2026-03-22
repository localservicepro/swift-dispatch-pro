

## Plan: MYOB Batch Invoice Integration with Auto Customer Matching

### Overview
When admin selects orders for a customer in Payment Management and clicks "Batch Invoice to MYOB", the system:
1. Auto-matches the customer in MYOB by company name (or creates them)
2. Creates a single MYOB Sale Invoice with all selected orders as line items
3. Retrieves the MYOB invoice number and stores it on each order
4. Uses the MYOB invoice number in Account Statements

### Database Changes

**New table: `myob_settings`**
- `client_id`, `client_secret` (API credentials)
- `access_token`, `refresh_token`, `token_expires_at` (OAuth tokens)
- `company_file_id`, `company_file_username`, `company_file_password`
- `connection_status` (default 'not_configured')
- `default_account_number` (default '4-1010')
- RLS: admin-only

**New column on `orders`:**
- `myob_invoice_number` (text, nullable) — MYOB invoice number retrieved after push

### Edge Functions

**1. `myob-auth`** — OAuth2 flow (authorize, callback, refresh, disconnect)

**2. `myob-push-invoice`** — Batch invoice creation:
- Receives list of order IDs + customer name
- **Auto customer matching**: queries MYOB `GET /Contact/Customer?$filter=CompanyName eq '{name}'`
  - If found → uses existing MYOB customer UID
  - If not found → creates new customer in MYOB via `POST /Contact/Customer`, uses returned UID
- Groups all orders into one MYOB Sale Invoice
- Each order becomes a line item in format: `{order_number} - {qty} {product} - DEL/Picked up - {address}`
- Account: 4-1010 (configurable), Tax: GST
- Retrieves MYOB invoice number from response
- Updates all included orders with `myob_invoice_number`

### UI Changes

**1. `src/components/settings/MyobSettings.tsx`** (new)
- Connection config panel: Client ID, Secret, Company File credentials
- OAuth connect/disconnect button
- Default account number setting
- Connection status indicator

**2. `src/components/Settings.tsx`** — Add MYOB settings card

**3. `src/components/payment/MyobBatchInvoiceDialog.tsx`** (new)
- Preview dialog showing orders mapped to MYOB line item format
- Editable fields: Customer name, Invoice date, each line description, account number
- Auto-matched MYOB customer shown (with "Create new" fallback indicator)
- Confirm button pushes to MYOB

**4. `src/components/PaymentManagement.tsx`** — Add "Batch Invoice to MYOB" button
- Visible when MYOB is connected and orders are selected
- Opens the preview dialog
- On success: shows MYOB invoice number, marks orders as synced

**5. `supabase/functions/generate-account-statement/index.ts`**
- Use `myob_invoice_number` as "Invoice No" column when available

### MYOB Line Item Format (per screenshot)

| Field | Value |
|---|---|
| Date | Delivery date |
| Description | `{order#} - {qty} {product}, {qty} {product} - DEL/Picked up - {suburb}` |
| Account No. | 4-1010 |
| Amount | Order total (GST inclusive) |
| Tax | GST |

### Data Flow
```text
Payment Management → Select orders → "Batch Invoice to MYOB"
  → Preview Dialog (editable line items)
  → Confirm → Edge Function:
    1. Search MYOB for customer by company name
    2. If not found, create customer in MYOB
    3. Create Sale Invoice with all orders as lines
    4. Retrieve MYOB invoice number
    5. Store on each order record
  → Success: display MYOB invoice number
```

### Files Created
1. Database migration — `myob_settings` table + `myob_invoice_number` column
2. `supabase/functions/myob-auth/index.ts`
3. `supabase/functions/myob-push-invoice/index.ts`
4. `src/components/settings/MyobSettings.tsx`
5. `src/components/payment/MyobBatchInvoiceDialog.tsx`

### Files Modified
1. `src/components/Settings.tsx` — add MYOB section
2. `src/components/PaymentManagement.tsx` — add MYOB batch invoice button + dialog
3. `supabase/functions/generate-account-statement/index.ts` — use MYOB invoice number
4. `supabase/config.toml` — add myob function configs

### Notes
- Integration shows "Not Configured" until MYOB API credentials are added
- Company file must be online (cloud-hosted) for API access
- Token refresh handled automatically before API calls
- Existing invoice/batch invoice buttons remain unchanged

