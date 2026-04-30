## Problem

The "Test Special" (10% off Bag Products, tiers: trade + account) is correctly stored in the database and the `get_active_specials_for_products` RPC returns 22 matching products when called directly. But on Step 2 "Select Products" of order creation, no SPECIAL badges or discounted prices appear.

## Root Causes

1. **Hardcoded `'trade'` tier in `ProductSelectionStep`** — `loadSpecialsForProducts` is called without a `customerTier` argument, so it always defaults to `'trade'`. If the selected customer is `residential` (or any non-matching tier), the RPC returns nothing and no specials show. The selected customer's `customer_type` is never propagated into the hook.

2. **`specialsLoading` guard creates a race** — `loadSpecialsForProductsBatched` checks `if (productIds.length === 0 || specialsLoading) return` and is recreated whenever `specialsLoading` flips. The effect only depends on `productIdsKey`, so when the product list changes during an in-flight load (e.g., after search/filter), the new batch is silently dropped.

3. **Unstable hook functions** — `useSpecialPricing` returns new function references every render, including `loadSpecialsForProducts`. Combined with #2 this can lead to stale closures.

4. **No visible logging** — silent failures in the RPC call or empty-response paths give no feedback for debugging in the field.

## Fix

### 1. Pass the customer's tier into `ProductSelectionStep`

`MultiStepOrderForm.tsx` and `CustomerOrderCreate.tsx` both render `ProductSelectionStep`. They have access to the selected customer object containing `customer_type` (`residential` | `trade` | `account`).

- Add an optional `customerTier?: string` prop to `ProductSelectionStep`.
- From parents, derive it from the selected customer: `customer.customer_type ?? 'residential'` and pass it.
- Use the prop when calling `loadSpecialsForProducts(ids, customerTier)`.
- Re-trigger the load when `customerTier` changes (add to the effect's dependency key).

### 2. Make `useSpecialPricing` callbacks stable

Wrap `loadSpecialsForProducts`, `getSpecialForProduct`, `hasActiveSpecial`, and `applySpecialDiscount` in `useCallback` so their identities don't change every render. Drop the redundant local `setSpecialsLoading` in `ProductSelectionStep` (use the hook's `loading` instead) and remove the `specialsLoading` guard so legitimate refetches aren't dropped.

### 3. Stabilise the load effect

Replace the wrapper `loadSpecialsForProductsBatched` with a direct call inside the effect, keyed by `productIdsKey + customerTier`. Add a small `console.debug` log of the call args + result count so the next regression is observable.

### 4. Verify Special UI also covers FloatingCart

`FloatingCart` already receives `hasActiveSpecial` and `getProductPrice`; once the map populates correctly the cart line totals will reflect the discount automatically. No change needed there beyond verifying.

## Files to change

- `src/hooks/useSpecialPricing.ts` — memoise returned callbacks, keep batched RPC call, add debug logging.
- `src/components/order/ProductSelectionStep.tsx` — accept `customerTier` prop, remove `specialsLoading` guard and wrapper, key effect on `productIdsKey + customerTier`.
- `src/components/order/MultiStepOrderForm.tsx` — pass `customerTier` derived from selected customer to `ProductSelectionStep`.
- `src/components/customer/CustomerOrderCreate.tsx` — same prop pass-through (use `'residential'` if no customer object available in that flow).

## Out of scope

- No DB migration needed. The `get_active_specials_for_products` function already works correctly (verified: returns 22 rows for the Bag Products + 'trade' tier).
- Special creation/editing UI in `SpecialManagement` is unchanged.
