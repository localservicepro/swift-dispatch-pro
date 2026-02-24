

## Create PIN Webhook Table and Integration

### What this does
Creates a new `portal_pin_webhooks` table that stores customer PIN data whenever a PIN is generated. This table acts as a queue -- when a new PIN is created (single or bulk), a record is inserted with the plain PIN, customer details, and webhook status. You can then send these records to your external webhook (e.g. Make/Zapier) to trigger your own email sender, following the same pattern already used by `order_sms_webhooks`.

### Database Changes

**New table: `portal_pin_webhooks`**

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| customer_id | uuid | Reference to customer |
| customer_name | text | Customer display name |
| customer_email | text | Customer email |
| company_name | text | Company/business name |
| pin_code | text | The plain-text PIN (for webhook delivery) |
| pin_expires_at | timestamptz | PIN expiration date |
| is_regeneration | boolean | Whether this was a regeneration |
| webhook_sent | boolean | Whether webhook was sent |
| webhook_sent_at | timestamptz | When webhook was sent |
| webhook_url | text | URL webhook was sent to |
| webhook_response | text | Response from webhook |
| created_at | timestamptz | Record creation time |
| updated_at | timestamptz | Last update time |

RLS policies: admin-only access + service_role access (same pattern as `order_sms_webhooks`).

### Edge Function Changes

1. **`generate-portal-pin/index.ts`** -- After PIN generation succeeds, insert a record into `portal_pin_webhooks` with the plain PIN and customer details.

2. **`bulk-generate-portal-pins/index.ts`** -- Same: after each successful PIN generation, insert a webhook record.

3. **New function: `pin-webhook/index.ts`** -- Reads unsent records from `portal_pin_webhooks`, sends each to your configured webhook URL (from `PIN_WEBHOOK_URL` secret), and marks them as sent. This follows the exact same pattern as the existing `sms-webhook` function.

### Secret Required

- `PIN_WEBHOOK_URL` -- The external webhook URL (e.g. Make scenario URL) where PIN data will be posted. You will need to add this in Supabase Edge Function secrets.

### Webhook Payload Format

```json
{
  "customer_id": "uuid",
  "customer_name": "John Smith",
  "customer_email": "john@example.com",
  "company_name": "Smith Corp",
  "pin_code": "482917",
  "pin_expires_at": "2026-05-25T00:00:00Z",
  "is_regeneration": false,
  "timestamp": "2026-02-24T12:00:00Z"
}
```

### Files Changed
- `supabase/functions/generate-portal-pin/index.ts` -- add webhook record insert
- `supabase/functions/bulk-generate-portal-pins/index.ts` -- add webhook record insert
- `supabase/functions/pin-webhook/index.ts` -- new function to send pending records to webhook
- New migration for `portal_pin_webhooks` table + RLS policies

