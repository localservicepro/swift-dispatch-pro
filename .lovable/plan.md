## Root cause

The remaining $5-markup bug on split orders lives in `src/components/order/MultiStepOrderForm.tsx`.

That file has a `useEffect` that auto-populates each split's `deliveryFee` from the suburb the moment the customer/suburb is set — *before* the user opens the Delivery Details tab. It uses `parseDeliveryRate(data.delivery_rate)` (line 153), which returns the raw suburb rate **without** the global delivery markup.

Result:
- Split cards, Review step, and the master `deliveryFee` displayed to the operator all show `$50` instead of `$55`.
- The server does recompute with markup on save, so the DB row is correct — but the totals shown/printed from client state on the review screen (and any pre-save receipt preview) drop the $5.

Every other split entry point (`CompactSplitConfig.handleSuburbChange`, `SplitEditPopovers`) already uses `computeFeeFromRate` (base + markup). The auto-populate effect is the last remaining path still using the un-marked helper.

## Fix

Single-file change in `src/components/order/MultiStepOrderForm.tsx`:

1. Replace the destructure `const { fetchSuburbData, parseDeliveryRate } = useDeliveryFeeCalculation();` with `const { fetchSuburbData, computeFeeFromRate } = useDeliveryFeeCalculation();`.
2. In the auto-populate effect, change `const fee = parseDeliveryRate(data.delivery_rate);` to `const fee = computeFeeFromRate(data.delivery_rate);` so the markup is applied at auto-population time, matching every other path.

No changes needed to the server (`orderCreationService.ts`) — its authoritative recompute is already correct. No DB schema changes.

## Verification

- Create a split order across two suburbs with a $5 fixed markup configured. Expect each split card to show `base + $5`, the Review step's per-split delivery lines and master delivery total to include the markup, and the saved `orders.delivery_fee` for each split row and the master to match what was shown.
- Edit a split's suburb via the popover: fee still shows `base + $5` (already correct).
- Manually override a split's fee: the typed value persists on save and on print (already correct, unchanged).

## Out of scope

No changes to receipt rendering, invoice printing, or split business logic. UI text and existing components untouched aside from the two lines above.
