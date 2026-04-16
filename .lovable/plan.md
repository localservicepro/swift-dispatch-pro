

## Fuel Surcharge: Apply Only to New Orders

### Problem
The fuel surcharge line item currently displays in the **order edit** form for all orders, including ones created before the feature existed. It should only appear and be calculated for **newly created orders** — editing an existing order should show whatever `fuel_surcharge` value was stored at creation time, not the current global setting.

### Changes

**1. `src/components/order/OrderPricingForm.tsx`**
- Change the fuel surcharge display to use the **order's stored `fuel_surcharge`** value (from `formData`) instead of the current `paymentSettings.fuel_surcharge`.
- Add the stored value to the `OrderFormData` or pass it via props from the order record.
- Only show the line if the order's stored `fuel_surcharge > 0`.

**2. `src/components/order/hooks/useOrderFormData.ts`**
- Include `fuel_surcharge` from the order record in the form data so it's available during editing.

**3. `src/components/order/OrderEditSections.tsx`**
- Pass the order's `fuel_surcharge` to `OrderPricingForm` so it displays the stored value, not the global setting.

**4. No change to order creation flow**
- The creation flow (`useOrderFormState.ts`, `orderCreationService.ts`) already correctly reads and stores the fuel surcharge from `paymentSettings` at creation time. This remains unchanged.

### Summary
- **New orders**: Fuel surcharge is read from `paymentSettings` and stored on the order — no change needed.
- **Editing orders**: Show the order's stored `fuel_surcharge` value instead of the current global setting. Orders created before the feature will have `fuel_surcharge = 0` and won't show the line.

### Files Modified
- `src/components/order/hooks/useOrderFormData.ts`
- `src/components/order/OrderPricingForm.tsx`
- `src/components/order/OrderEditSections.tsx`

