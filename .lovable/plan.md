

## Fix: Phantom $5 fuel surcharge appearing on pickup/yard orders

### Root cause

ORD-795464 (a "Pickup from yard" order) has `total_amount=520` but `subtotal=515`, `delivery_fee=0`, `adjustments=0`, `fuel_surcharge=0` in the database. Activity log shows it was edited from $504 → $520 shortly after creation.

The likely sequence:
1. Order was opened in the edit dialog while still classified as a delivery order. The new "Apply missing fuel surcharge" prompt fired and the user (or the form re-initialization) added the $5 surcharge to `formData.fuel_surcharge` and `formData.total_amount`.
2. The delivery method was then switched to `pickup`, but **nothing zeros `formData.fuel_surcharge` when delivery_method changes**.
3. On save, the surcharge made its way into `total_amount` (or the recompute used a stale subtotal). Either way, the saved `total_amount` is $5 above the true pickup total of $515.

The same bug surface exists for the create flow if a user toggles delivery → pickup mid-flow.

There are also two structural gaps:
- `OrderEditFormSubmission.ts` recomputes `finalTotalAmount = subtotal + adj + delivery_fee + fuel_surcharge` **without** gating on `delivery_method`, so any non-zero `fuel_surcharge` carried in form state silently inflates a pickup order's total.
- `useOrderFormData.ts`'s "missing fuel surcharge" prompt fires whenever `delivery_method === 'delivery' && stored === 0`, but never clears `formData.fuel_surcharge` when the user later switches to pickup in the same edit session.

### Fixes

1. **`src/components/order/OrderEditFormSubmission.ts`** — always force `fuel_surcharge = 0` and exclude it from `finalTotalAmount` when `submissionData.delivery_method === 'pickup'`. This is the authoritative server-style guard so a pickup order can never persist a non-zero fuel surcharge regardless of form state.

2. **`src/components/order/hooks/useOrderFormData.ts`** —
   - When `formData.delivery_method` changes to `'pickup'` (via `handleInputChange`/`handleFormDataChange`), reset `formData.fuel_surcharge` to 0, recompute `formData.total_amount`, and clear `formData.delivery_fee` if it's non-zero.
   - Make `missingFuelSurchargeAmount` continually re-gate on the current `formData.delivery_method`, so toggling to pickup hides the prompt and toggling back to delivery re-shows it.
   - In `getCalculationBreakdown` and `calculateTotals`, when `delivery_method === 'pickup'`, ignore `formData.fuel_surcharge` entirely (treat as 0) so the displayed total cannot drift above what would be saved.

3. **`src/components/order/services/orderCreationService.ts`** — already gated correctly, but add a final defensive line in both `createSingleOrder` and the split path: `const safeFuelSurcharge = params.deliveryMethod === 'pickup' ? 0 : authoritativeFuelSurcharge;` and use it for both the column and the total. (Belt-and-braces; current code already does this but it makes the invariant explicit and protects the split path's master-order write.)

4. **One-time data repair migration** — find delivery_method=pickup orders where `total_amount > subtotal + COALESCE(delivery_fee,0) + COALESCE(adjustments,0)` and the difference equals the current `payment_settings.fuel_surcharge` (within $0.01). For unpaid orders, correct `total_amount = subtotal + delivery_fee + adjustments` and ensure `fuel_surcharge = 0`. For paid orders (like ORD-795464), only flag in `activity_logs` for manual review/refund — do not silently change a paid total. Wrap in a transaction, log counts.

5. **Verification** — re-query ORD-795464 post-flag and a sample of any other affected pickup orders. Confirm new pickup orders cannot persist `total_amount > subtotal + delivery_fee + adjustments`.

### Files modified

- `src/components/order/OrderEditFormSubmission.ts`
- `src/components/order/hooks/useOrderFormData.ts`
- `src/components/order/services/orderCreationService.ts`
- New migration: `supabase/migrations/<ts>_repair_pickup_phantom_surcharge.sql`

### Result

- Pickup/yard orders can never persist a fuel surcharge — neither in `fuel_surcharge` column nor inflated into `total_amount`.
- Switching delivery method to pickup mid-edit immediately strips any previously-applied surcharge from the displayed total.
- Existing affected unpaid pickup orders auto-corrected; paid ones (incl. ORD-795464) flagged for admin review so the $5 overcharge can be refunded manually.

