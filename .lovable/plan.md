

## Add Fuel Surcharge for Deliveries

### Overview
Add a configurable fuel surcharge (default $5 AUD) applied to every delivery order. Admins can adjust the amount in Payment Settings.

### Database Changes
- Add `fuel_surcharge` column (numeric, default 5.00) to `payment_settings` table
- Migration with `ALTER TABLE payment_settings ADD COLUMN fuel_surcharge numeric NOT NULL DEFAULT 5.00`

### Files Modified

**1. `src/components/payment/PaymentSettings.tsx`**
- Add `fuel_surcharge` to the form data interface and state
- Add a "Fuel Surcharge ($)" input field in the Delivery Markup section (or its own section)
- Save/load the new field

**2. `src/hooks/usePaymentSettings.ts`**
- Add `fuel_surcharge` to the `PaymentSettings` interface (default 5.00)

**3. `src/components/storefront/StorefrontOrderFlow.tsx`**
- Fetch `payment_settings` (anon needs SELECT — will need RLS policy or fetch via edge function)
- When delivery method is selected, add fuel surcharge to `cartTotal`
- Show fuel surcharge as a separate line in the order summary

**4. `src/components/order/utils/paymentCalculations.ts`**
- Add `fuel_surcharge` to the PaymentSettings interface
- Include fuel surcharge in `calculateOrderTotals` when delivery method applies

**5. `src/components/order/OrderPricingForm.tsx`**
- Display fuel surcharge line item when order is delivery

**6. Database: RLS policy**
- Add anon SELECT on `payment_settings` for the `fuel_surcharge` column (or query it in the edge function and pass it back). Since the storefront already calls the edge function, the cleaner approach is to have `storefront-create-order` read the fuel surcharge server-side and add it to the order total.

### Approach for Storefront
Rather than giving anon access to `payment_settings`, the `storefront-create-order` edge function will read `fuel_surcharge` from `payment_settings` server-side and apply it to the delivery fee/total. The storefront UI will show the fuel surcharge by fetching it from a lightweight edge function or embedding it in the product listing response. Simpler: add an anon SELECT policy on `payment_settings` limited to non-sensitive columns (fuel_surcharge, gst_rate, etc.) so the storefront can display it.

### Refined approach
Add anon RLS SELECT policy on `payment_settings` so the storefront can read `fuel_surcharge` to display it in the order summary. The edge function also reads it server-side when creating the order.

### Files
- New migration: add `fuel_surcharge` column + anon SELECT policy on `payment_settings`
- `src/hooks/usePaymentSettings.ts` — add field
- `src/components/payment/PaymentSettings.tsx` — add input
- `src/components/storefront/StorefrontOrderFlow.tsx` — fetch and display fuel surcharge for deliveries
- `src/components/order/utils/paymentCalculations.ts` — include in calculations
- `src/components/order/OrderPricingForm.tsx` — display line item
- `supabase/functions/storefront-create-order/index.ts` — apply fuel surcharge server-side

