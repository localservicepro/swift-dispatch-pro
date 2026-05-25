## Root cause

The per-split delivery fee is auto-fetched inside `CompactSplitConfig.tsx` (the "Delivery Details" tab of the Split Order Configuration step). The effect that calls `fetchSuburbData` → `parseDeliveryRate` → `onUpdateSplit({ deliveryFee })` only runs while that component is mounted.

When the user allocates products and clicks forward to the Review step without visiting the "Delivery Details" tab, `split.deliveryFee` stays `undefined`/`0`. The Review summary then shows AU$0.00. Going back and opening the delivery tab mounts `CompactSplitConfig`, the effect fires, fees populate, and Review then shows the correct values.

`MultiStepOrderForm` also has an effect that sums `split.deliveryFee` into the global `deliveryFee` — but it sums zeros until the splits actually carry a fee.

## Fix

Move the auto-fee-calculation effect out of `CompactSplitConfig` and into a parent that is mounted regardless of which step/tab is active, so split fees are populated as soon as splits exist and have a resolvable suburb (either `deliverySuburbId` or `sameAsBilling` + `customer.suburb_id`).

### Changes

1. **`src/components/order/MultiStepOrderForm.tsx`**
   - Add a `useEffect` (next to the existing split-sum effect at lines 127–138) that, when `orderType === 'split'` and `deliveryMethod === 'delivery'`, iterates `splits`, resolves a `suburbId` per split (`split.deliverySuburbId ?? (split.sameAsBilling ? selectedCustomer?.suburb_id : null)`), fetches suburb data via `useDeliveryFeeCalculation().fetchSuburbData`, parses the rate via `parseDeliveryRate`, and calls `setSplits` once with all updated `deliveryFee` values when any split currently has `deliveryFee === undefined || 0`.
   - Dependency key: `splits.map(s => `${s.deliverySuburbId ?? ''}|${s.sameAsBilling}`).join(',')`, `selectedCustomer?.suburb_id`, `orderType`, `deliveryMethod`.
   - Use a local `cancelled` flag to ignore stale async results on unmount/re-run.

2. **`src/components/order/CompactSplitConfig.tsx`**
   - Remove the `useEffect` at lines 92–127 (now handled by the parent). Keep `handleSuburbChange` (lines 80–89) so manual suburb edits still update the fee immediately.

### Out of scope

- No change to `parseDeliveryRate`, `applyMarkup`, or the existing "delivery markup" behavior (matches what `CompactSplitConfig` does today — applies base rate without markup; preserving current behavior).
- No change to Review UI, the split-sum aggregation effect, or order creation services.
- No backend or RPC changes.

## Validation

- Open a split order with 3 splits all using billing-address suburb (rate 50). Go straight from Product Allocation → Review. Each split should show AU$50.00 immediately and the totals should include 3 × 50.
- Change one split's suburb via "Use Different Address" → confirm fee updates immediately on the delivery tab and persists on Review.
- Single-order flow (`orderType === 'single'`) should be unaffected.
