

## Fix: New PIN Replaces Old PIN in Webhook Table (Security)

### Problem
When a PIN is regenerated for a customer, a new row is added to `portal_pin_webhooks` but the old row with the previous PIN remains. This means your webhook could pick up and send the old (now invalid) PIN, and the old plain-text PIN stays stored unnecessarily -- a security concern.

### What the fix does
Before inserting a new webhook record, **delete all previous unsent records** for that customer. This ensures:
- Only the latest PIN exists in the webhook queue
- Old PINs are not stored in plain text longer than needed
- Your webhook will never send a stale/invalid PIN

### Changes

**`supabase/functions/generate-portal-pin/index.ts`**
- Before the webhook insert (line 155), add a delete statement to remove any existing unsent webhook records for the same `customer_id`

**`supabase/functions/bulk-generate-portal-pins/index.ts`**
- Same pattern before the webhook insert (line 191): delete previous unsent records for that customer before inserting the new one

### Code pattern (both files)
```typescript
// Delete any previous unsent webhook records for this customer
await supabase
  .from('portal_pin_webhooks')
  .delete()
  .eq('customer_id', customer_id)
  .eq('webhook_sent', false);

// Then insert the new record
await supabase.from('portal_pin_webhooks').insert({...});
```

### Security note
The customer's actual PIN hash in the `customers` table is already replaced on regeneration, so the old PIN cannot be used to log in. This change ensures the webhook table also stays clean -- no stale plain-text PINs sitting around, and your external email sender always gets the correct current PIN.

### Files changed
- `supabase/functions/generate-portal-pin/index.ts`
- `supabase/functions/bulk-generate-portal-pins/index.ts`

