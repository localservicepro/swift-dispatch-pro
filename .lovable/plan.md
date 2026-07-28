## Goal
The Edit Order dialog feels slow because totals/fields visibly re-render several times per second. Find every recomputation trigger, remove the ones that are redundant, and memoize the rest so a single keystroke causes exactly one render.

## What's causing the churn (verified from the current code)

Nothing in the dialog runs on a literal `setInterval` — the "every ½ second" is the combined effect of several async triggers stacking up:

1. **`useOrderFormData` — paymentSettings effect** (`src/components/order/hooks/useOrderFormData.ts:340-348`)
   `useEffect(..., [paymentSettings])` calls `calculateTotals({})` and does `setFormData` whenever the `usePaymentSettings` query object identity changes (react-query refetches, window focus, cache invalidation). Each run re-renders the whole form.

2. **`useConflictDetection` — 300 ms debounced Supabase call** (`src/components/order/hooks/useConflictDetection.ts:16-61`)
   Fires on every change of `deliveryDate / deliveryTime / driverId / truckId / excludeOrderId`. `excludeOrderId` is `order.id` (stable) but the other four flip on every keystroke in date/time. Each debounce ends in two Supabase round-trips + `setState`, ~300–800 ms after typing stops — reads as "recalculating half a second later".

3. **`OrderEditFormLogic` — suburb fetch effect** (`src/components/order/OrderEditFormLogic.ts:74-94`)
   Runs a Supabase `select` on `suburbs` every time `delivery_suburb_id` OR `suburb_id` changes, and writes `deliveryRate` state. Any suburb toggle triggers a network round-trip + re-render, even though `useDeliveryFeeCalculation` already fetched the same row.

4. **`useOrderFormData` — product price hydration** (`useOrderFormData.ts:76-154`)
   Runs on mount, does a Supabase `select` on `products`, then `setFormData` with new prices + subtotal. This is a second render burst right after the dialog opens.

5. **`calculateTotals` called from every `handleInputChange` branch**
   Recomputes and does `setFormData` on every keystroke in Subtotal / Delivery Fee / Adjustments / Payment Method / Delivery Method. Cheap in isolation, but combined with (1) and (2) each keystroke triggers 2–3 renders.

6. **`useOrderReturns` + `useCustomerCredits`** (loaded inside `OrderPricingForm`)
   Each is a react-query hook subject to `refetchOnWindowFocus`. If defaults aren't tuned, focusing back into the dialog refetches both.

## Fix plan

### Step 1 — Confirm with one profiling pass (no code change)
Open the Edit Order dialog with React DevTools Profiler recording, type one character in Delivery Fee, and record ~2 s. Capture:
- render count of `OrderEditForm` / `OrderPricingForm`
- which hook committed each render (paymentSettings, conflict, suburb fetch, returns, credits)

This turns "feels slow" into an ordered list so we only touch the offenders. Do this before any edit.

### Step 2 — Stop the paymentSettings effect from re-firing
In `useOrderFormData.ts`:
- Replace the `useEffect([paymentSettings])` that rewrites `total_amount` with a `useMemo`-derived total that reads current form + settings, OR gate the effect on a stable primitive (e.g. `paymentSettings?.gst_rate + service_charge_rate + fuel_surcharge`) so it runs once when settings load, not on every query object identity change.
- Configure `usePaymentSettings` react-query options: `staleTime: 5 * 60_000`, `refetchOnWindowFocus: false`, `refetchOnMount: false`.

### Step 3 — Cut conflict-check thrash
In `useConflictDetection.ts`:
- Bump debounce from 300 ms → 600 ms.
- Add an early-return guard: skip when `deliveryDate`/`deliveryTime` didn't actually change vs the previous run (ref compare) so re-renders from unrelated state don't retrigger it.
- Ensure the parent passes stable primitives (they already do).

### Step 4 — Remove the duplicate suburb fetch
In `OrderEditFormLogic.ts`:
- Delete the local `deliveryRate` `useEffect` + state. `useDeliveryFeeCalculation` already owns suburb data; expose its `suburb.delivery_rate` and read it from there. This eliminates one Supabase round-trip + one render per suburb change.

### Step 5 — Collapse the product-price hydration render
In `useOrderFormData.ts`:
- Merge the hydration `setFormData` into the initial state via `useState(() => ...)` when the products already have `unit_price`, OR use a single `useEffect` that skips the write when nothing actually changed (deep-equal on `products` + `subtotal`).

### Step 6 — Tame the two auxiliary queries
In `useOrderReturns` and `useCustomerCredits`:
- Set `staleTime: 60_000`, `refetchOnWindowFocus: false`. Verify `orderId`/`customerId` are stable so the query keys don't churn.

### Step 7 — One render per keystroke in pricing inputs
In `useOrderFormData.ts` `handleInputChange`:
- Fold `calculateTotals` into the same `setFormData(prev => ...)` call already made for each field so we do one state write per keystroke, not two.

### Step 8 — Verify
- Re-run the Step 1 profiler recording and confirm typing in Delivery Fee produces a single commit; opening the dialog produces ≤2 commits after data resolves.
- Regression-check: totals still match on suburb change, payment method change, fuel surcharge toggle, and initial open of an existing order.

## Risk

- Changes are isolated to `useOrderFormData`, `useConflictDetection`, `OrderEditFormLogic`, `usePaymentSettings`, `useOrderReturns`, `useCustomerCredits`. All are read by the Edit Order dialog only (plus `usePaymentSettings`, which is read broadly — its query-option changes are safe defaults, no schema/behavior change).
- No DB migrations, no changes to submission payloads, no changes to split-order flow.
