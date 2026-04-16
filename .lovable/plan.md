

## Fix Fuel Surcharge in Order Summary and Split Orders

### Problems
1. The admin Order Review Step doesn't display a fuel surcharge line item in the order summary.
2. Split orders don't include fuel surcharge per split — each split should add $5 (or configured amount) individually.
3. The `calculateOrderTotals` function returns `fuelSurcharge` but doesn't add it to `totalAmount` (it assumes it's baked into `deliveryFee`, but in the admin flow it isn't).

### Changes

**1. `src/components/order/OrderReviewStep.tsx`**
- Add a "Fuel Surcharge" line item in the order summary between Delivery Fee and Surcharge, only when `deliveryMethod === "delivery"`.
- For split orders, show fuel surcharge per split (e.g., "2 × $5.00 = $10.00").

**2. `src/components/order/utils/paymentCalculations.ts`**
- Update `calculateOrderTotals` to accept `deliveryMethod` and add `fuelSurcharge` to `totalAmount` when delivery (currently it's display-only and not added to the total).

**3. `src/components/order/services/orderCreationService.ts`**
- **Single orders**: Already stores `fuel_surcharge` from `orderTotals.fuelSurcharge`. Ensure it's included in `total_amount`.
- **Split orders**: Add `fuel_surcharge` per split order. Each split with delivery method gets the surcharge. Update master order's `fuel_surcharge` to be the sum across all splits.

**4. `src/components/order/MultiStepOrderForm.tsx`**
- Pass `deliveryMethod` to `calculateOrderTotals` so the fuel surcharge is only applied for delivery orders.

### Split Order Logic
- Each split that is a delivery gets fuel surcharge added to its `total_amount` and stored in `fuel_surcharge`.
- Master order `fuel_surcharge` = sum of all splits' fuel surcharges (e.g., 2 splits × $5 = $10).
- The OrderReviewStep split breakdown will show fuel surcharge per split.

### Files Modified
- `src/components/order/utils/paymentCalculations.ts`
- `src/components/order/OrderReviewStep.tsx`
- `src/components/order/services/orderCreationService.ts`
- `src/components/order/MultiStepOrderForm.tsx` (if needed to pass deliveryMethod)

