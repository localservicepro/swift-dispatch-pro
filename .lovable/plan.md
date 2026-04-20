

## Plan: Fix Fuel Surcharge & Total Amount Inconsistencies

### Root causes (verified)

**Bug A — Edit dialog shows a different total than the saved order ($504 vs $499)**
- `useOrderFormData.calculateTotals()` and `getCalculationBreakdown()` call `calculateOrderTotals(...)` without passing `deliveryMethod` or `splitCount`. The util defaults `deliveryMethod = 'delivery'`, so it always **adds** `paymentSettings.fuel_surcharge ($5)` to the displayed total — regardless of what is actually stored on the order.
- For ORD-234588 (stored `fuel_surcharge=0`), the edit screen shows total $504 but the breakdown doesn't render a Fuel Surcharge line (it gates on `formData.fuel_surcharge > 0`, which is 0). On save, `OrderEditFormSubmission` writes `fuel_surcharge: preservedFuelSurcharge = 0` and recomputes total = $499 — silently dropping the $5 the user just saw.

**Bug B — New delivery orders are being created with `fuel_surcharge = 0`** (388 in the last 14 days)
- `src/components/customer/CustomerOrderCreate.tsx` inserts directly into `orders` with **no `fuel_surcharge` field**, falling back to the column default of 0, and writes `total_amount = subtotal` (no delivery fee, no surcharge).
- `supabase/functions/storefront-create-order/index.ts` saves `fuel_surcharge` correctly but excludes it from `total_amount` (`total_amount: subtotal + sanitizedDeliveryFee`), creating the same display/receipt mismatch.
- The main multi-step flow (`orderCreationService.ts`) is already fixed — but it isn't the only path.

### Fixes

1. **`src/components/order/hooks/useOrderFormData.ts`** — make the edit form authoritative on the stored fuel surcharge:
   - In `calculateTotals()` and `getCalculationBreakdown()`, compute totals as `subtotal + adjustments + delivery_fee + formData.fuel_surcharge` (no implicit `+ paymentSettings.fuel_surcharge`). Stop relying on `calculateOrderTotals`'s default `deliveryMethod='delivery'` to silently add a surcharge.
   - When the edit dialog opens for a delivery order whose stored `fuel_surcharge` is 0 and `payment_settings.fuel_surcharge > 0`, surface a one-time inline notice: "Fuel surcharge missing — apply $X.XX?" with an Apply button that sets `formData.fuel_surcharge` and recalculates. (No silent auto-add.)

2. **`src/components/order/OrderPricingForm.tsx`** — render the Fuel Surcharge breakdown row whenever delivery method is `delivery` and either `formData.fuel_surcharge > 0` *or* the missing-surcharge notice is showing, so the user always sees what's being charged.

3. **`src/components/order/OrderEditFormSubmission.ts`** — keep the recompute-total logic but use `formData.fuel_surcharge` from the form (already preserved/edited) instead of the original order's value, so the Apply action above persists.

4. **`src/components/customer/CustomerOrderCreate.tsx`** — fetch `payment_settings.fuel_surcharge`, compute it for delivery orders, write `fuel_surcharge` and a correct `total_amount = subtotal + delivery_fee + fuel_surcharge` on insert. (Currently delivery_fee = 0 here too — leave 0 unless suburb logic is added later, but include the fuel surcharge.)

5. **`supabase/functions/storefront-create-order/index.ts`** — change `total_amount` to `subtotal + sanitizedDeliveryFee + fuelSurcharge` so the saved total matches the receipt.

6. **One-time data repair migration** — for delivery orders created in the last 60 days where `fuel_surcharge = 0` and `delivery_method = 'delivery'` and `deleted_at IS NULL`:
   - Set `fuel_surcharge = (current payment_settings.fuel_surcharge)`
   - Set `total_amount = COALESCE(subtotal,0) + COALESCE(delivery_fee,0) + COALESCE(adjustments,0) + new fuel_surcharge`
   - Skip orders already marked `paid` to avoid silently changing closed financials — flag them via an `activity_logs` entry instead so the admin can review/refund manually.
   - Wrap in a transaction; log a summary count.

7. **Verification**: re-query a sample of repaired orders + ORD-234588 / ORD-630356 and confirm `total_amount = subtotal + delivery_fee + adjustments + fuel_surcharge`.

### Files modified

- `src/components/order/hooks/useOrderFormData.ts`
- `src/components/order/OrderPricingForm.tsx`
- `src/components/order/OrderEditFormSubmission.ts`
- `src/components/customer/CustomerOrderCreate.tsx`
- `supabase/functions/storefront-create-order/index.ts`
- New migration: `supabase/migrations/<ts>_repair_missing_fuel_surcharge.sql`

### Result

- Edit dialog totals always equal `subtotal + delivery_fee + adjustments + fuel_surcharge` — no phantom $5.
- Every order-creation path (multi-step admin, customer-profile quick-create, storefront) saves a correct `fuel_surcharge` and matching `total_amount`.
- 14-day backlog of 388 delivery orders with missing surcharge gets repaired (excluding paid orders, which are flagged for manual review).
- Receipts and Order Management list will show identical totals.

