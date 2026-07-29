## Root cause (verified against production data)

The statement generator in `supabase/functions/generate-account-statement/index.ts` filters rows to those where the fulfilment date is non-null and within the selected month:

```ts
const orderDate = order.delivery_method === 'pickup' ? order.pickup_date : order.delivery_date;
return orderDate && orderDate >= startDate && orderDate <= endDate;
```

For **pickup / yard-sale orders**, `pickup_date` is almost always NULL in the database — even though `delivery_date` is often populated. Counts of delivered pickup orders with `pickup_date IS NULL`:

| payment_type    | pickup_date null (delivery_date set) | pickup_date null (both null) |
|-----------------|--------------------------------------|------------------------------|
| 30_day_account  | 103                                  | 851                          |
| residential     | 106                                  | 174                          |
| 7_day_account   | 1                                    | 3                            |
| cod             | 1                                    | 1                            |

Result: virtually every pickup/yard-sale order silently disappears from the statement, regardless of payment_type.

The client's other observation — "orders not marked as 30 Day Account don't appear" — is **not** caused by a payment_type filter. Neither the edge function nor `useAccountStatementExport.ts` filters on `payment_type`. The correlation they noticed is because the affected orders are pickup / yard-sale rows (which the migration commonly reclassified to `residential`), and those are the same rows being dropped for the `pickup_date IS NULL` reason above. No code change is required to "un-filter" residential — those rows will reappear once the date-fallback fix lands.

## Fix

### 1. Edge function `supabase/functions/generate-account-statement/index.ts`
Replace the strict pickup/delivery date selection with a coalesced fulfilment date, so no delivered row is dropped just because one date field is null:

```ts
const orderDate =
  (order.delivery_method === 'pickup' ? order.pickup_date : order.delivery_date)
  ?? order.delivery_date
  ?? order.pickup_date
  ?? order.created_at;
```

Apply the same coalesce in three places:
- the main statement filter (line ~95)
- the aging-bucket loop (line ~115)
- the row date display (`fulfillmentDate`, line ~204) — this already falls back to `created_at`, keep it consistent with the resolver above

Also broaden the status filter to future-proof against pickup-specific statuses:
```ts
.in("status", ["delivered", "pickup_complete"])
```
(`pickup_complete` is unused today but exists in the enum; harmless to include.)

### 2. Client preview `src/hooks/useAccountStatementExport.ts`
Mirror the same coalesced date logic in the `previewData` filter (line ~40) so the "Orders Found" count in the dialog matches what the PDF will render.

### 3. Optional visibility improvement (small)
Add a "Type" column to the statement row (payment_type label from `paymentTypes.ts`) so staff can see at a glance which orders were classified as Residential vs 30 Day Account, and spot mis-classified rows without opening each order. This is display-only — no filtering.

## Not doing (out of scope for this fix)
- No backfill of `pickup_date` on historical rows — the fallback covers reads. If the client later wants pickup_date populated for reporting elsewhere, that's a separate migration.
- No change to payment_type on existing residential-tagged account orders — the client said they'll re-tag manually. Once re-tagged, they'll continue to appear (they already would, once the date fix lands).
- No changes to order create/edit flow.

## Regression risk
- Edge function: change is additive (fallback chain). Any row previously included will still be included; previously-dropped pickup rows with a `delivery_date` now appear on the correct month. Rows with all three date fields null fall back to `created_at`, which matches the row-display fallback already in use.
- Preview hook: same-shape change, only affects the counter shown in the dialog.
- Aging buckets will now include pickup orders that were previously invisible — this is the intended behaviour (they are real unpaid receivables).

## Verification
1. Open the dialog for a customer with a known pickup/yard-sale delivered order in the target month → order count includes it.
2. Generate the statement → the pickup row appears in the correct address group with its `delivery_date`-based row date.
3. Aging summary total increases by the pickup order's amount if unpaid.
4. Existing delivery-method orders render identically to before (spot-check totals against a prior statement).
