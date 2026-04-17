
Fix the edit flow so fuel surcharge survives after order creation and displays correctly in the Pricing & Details summary.

1. Root cause
- The Orders list fetch (`src/components/order/hooks/useOrderData.ts`) does not select `fuel_surcharge`.
- When you click Edit, the order object passed into the dialog is missing that stored value, so `useOrderFormData` initializes `fuel_surcharge` as `0`.
- That is why the total still looks correct, but the separate “Fuel Surcharge” line disappears.

2. Changes to make
- Update `src/components/order/hooks/useOrderData.ts`
  - Add `fuel_surcharge` to the orders `select(...)`.
  - Add `fuel_surcharge?: number` to the local `Order` type there.
  - Preserve it in the mapped order returned to Order Management.
- Update edit-flow typings for safety
  - Add `fuel_surcharge?: number` where the intermediate order types are still missing it, especially:
    - `src/components/order/OrderEditDialog.tsx`
    - `src/components/order/OrderManagementProvider.tsx` if needed
- Update edit calculations in `src/components/order/hooks/useOrderFormData.ts`
  - Make edit-mode calculations use the stored `formData.fuel_surcharge`, not the current global payment setting.
  - Pass `formData.delivery_method` into the calculation path so pickup never shows or applies fuel surcharge.
  - Keep legacy orders safe: if stored `fuel_surcharge` is `0`, nothing appears.
- Keep `src/components/order/OrderPricingForm.tsx` display logic tied to:
  - delivery only
  - stored `formData.fuel_surcharge > 0`

3. Expected result
- A newly created delivery order like `ORD-391951JT` will show the fuel surcharge again when reopened in Edit.
- Older orders created before this feature will still stay hidden if they have no stored fuel surcharge.
- Pickup orders will not show fuel surcharge.
- Split orders will reflect whatever surcharge is stored on that specific record.

4. Technical details
- No database migration needed.
- This is a frontend data-fetch + edit-calculation consistency fix.
- Main files:
  - `src/components/order/hooks/useOrderData.ts`
  - `src/components/order/hooks/useOrderFormData.ts`
  - `src/components/order/OrderEditDialog.tsx`
  - `src/components/order/OrderManagementProvider.tsx` (if typing update is needed)

5. Verification after implementation
- Create a new delivery order and confirm fuel surcharge appears in create summary.
- Reopen the same order from `/orders` and confirm the edit summary shows the same fuel surcharge.
- Open a legacy order with no stored fuel surcharge and confirm it stays hidden.
- Check a pickup order and confirm no fuel surcharge appears.
