

## Fix: ORD-795464 receipt prints $520 instead of $515

### Root cause

The database still stores `total_amount = 520` for ORD-795464, even though `subtotal + delivery_fee + adjustments + fuel_surcharge = 515 + 0 + 0 + 0 = 515`. The receipt edge function correctly trusts `order.total_amount` for the grand total, so it prints **Sale Total $515 / Total $520** — a $5 jump with no line item to justify it.

The earlier pickup-phantom-surcharge migration deliberately **skipped paid orders** (only flagging them in `activity_logs`) to avoid silently mutating closed financials. ORD-795464 was paid in cash, so it was flagged but never corrected — the receipt still reflects the wrong number.

### Fix

1. **Targeted data repair migration** for paid pickup orders flagged by the previous run:
   - Find orders where `delivery_method = 'pickup'`, `deleted_at IS NULL`, `payment_status = 'paid'`, and `total_amount > subtotal + COALESCE(delivery_fee,0) + COALESCE(adjustments,0) + COALESCE(fuel_surcharge,0) + 0.01`.
   - Update `total_amount = subtotal + delivery_fee + adjustments + fuel_surcharge` and `fuel_surcharge = 0`.
   - Log each correction to `activity_logs` with action `pickup_phantom_surcharge_corrected`, capturing the previous and new totals so the cash overcharge is auditable for refund.
   - Wrap in a transaction; emit a notice with the count.

2. **Receipt defensive guard** (`supabase/functions/generate-receipt/index.ts` and `generate-pdf-receipt/index.ts` if it has the same logic):
   - Compute `expectedTotal = subtotal + deliveryFee + adjustments + fuelSurcharge + surchargeAmount`.
   - If `Math.abs(order.total_amount - expectedTotal) > 0.01`, use `expectedTotal` for the printed grand total instead of the stored value, so a stale stored total can never produce a mystery jump on a printed receipt again.
   - Keep the existing fallback to `invoice?.amount` when an invoice is attached (invoices are authoritative).

### Verification

- Re-query ORD-795464 and confirm `total_amount = 515`.
- Reprint the receipt and confirm Sale Total $515 / Total $515 (no $5 jump, no orphan Surcharge line).
- Confirm an `activity_logs` entry exists noting the $5 cash overcharge to refund the customer.

### Files modified

- New migration: `supabase/migrations/<ts>_correct_paid_pickup_phantom_surcharge.sql`
- `supabase/functions/generate-receipt/index.ts`
- `supabase/functions/generate-pdf-receipt/index.ts` (only if it has equivalent total logic)

### Result

- ORD-795464 (and any other paid pickup orders with the same phantom $5) will print correctly at $515.
- An auditable activity log entry per corrected order lets admins identify the cash overcharges that need to be refunded.
- Future stored/computed total mismatches will be self-healed at print time so customers never see a confusing receipt again.

