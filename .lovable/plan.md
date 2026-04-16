

## Add Fuel Surcharge to Invoices, Receipts, and Statements

### Overview
The fuel surcharge is stored as part of the `delivery_fee` on orders (the edge function adds it server-side). Since `delivery_fee` already includes the fuel surcharge baked in, the statements already reflect the correct totals. However, we should display the fuel surcharge as a **separate line item** on receipts and invoice emails so customers can see the breakdown.

### Approach
The fuel surcharge amount needs to be stored separately on orders so it can be displayed distinctly. Currently the `storefront-create-order` function adds it into `delivery_fee`. We need to either:
- **(Option A)** Add a `fuel_surcharge` column to `orders` table to store the applied surcharge per order, then display it separately in receipts/invoices/statements.
- **(Option B)** Read `fuel_surcharge` from `payment_settings` at render time and show it as a line item on receipts and invoices. This is simpler but won't reflect historical values if the rate changes.

**Chosen: Option A** — store on the order for accuracy.

### Changes

**1. Database Migration**
- Add `fuel_surcharge numeric DEFAULT 0` column to `orders` table.

**2. `supabase/functions/storefront-create-order/index.ts`**
- Store the fuel surcharge value in the new `fuel_surcharge` column when creating the order (already calculated there).

**3. `supabase/functions/generate-receipt/index.ts`**
- Read `order.fuel_surcharge` and display it as a separate "Fuel Surcharge" line between "Delivery" and "Sale Total" in the totals section.
- Adjust `deliveryFee` display to show only the suburb delivery rate (i.e., `delivery_fee - fuel_surcharge`).

**4. `supabase/functions/send-emails/_templates/invoice.tsx`**
- Add `fuelSurcharge` prop to the interface.
- Add a "Fuel Surcharge" row between "Delivery Fee" and "Total Amount" in the email template.

**5. `supabase/functions/generate-account-statement/index.ts`**
- No changes needed — the statement shows order-level totals (Charges/Payments/Balance) which already include the fuel surcharge in `total_amount`. The statement is an accounting document, not an itemized invoice.

**6. Admin order creation (`orderCreationService.ts`)**
- When creating orders via admin panel with delivery method, also fetch and store fuel surcharge in the new column.

### Files Modified
- New migration: add `fuel_surcharge` column to `orders`
- `supabase/functions/storefront-create-order/index.ts` — store fuel surcharge separately
- `supabase/functions/generate-receipt/index.ts` — display fuel surcharge line
- `supabase/functions/send-emails/_templates/invoice.tsx` — add fuel surcharge row
- `src/components/order/services/orderCreationService.ts` — include fuel surcharge on admin-created delivery orders

