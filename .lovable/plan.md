## Goal
Let the order creator override the delivery fee for each split independently, including setting it to `$0` for free delivery, while keeping the auto-calculated suburb rate as the default.

## Change (single file)
`src/components/order/CompactSplitConfig.tsx` — the "Delivery Fee Display" block (lines ~310–326) becomes editable.

### New UI for that block
- Keep the same blue card and "Delivery Fee" label.
- Replace the read-only `Badge` with a small numeric input:
  - `type="number"`, `min=0`, `step=0.01`, prefixed with `AU$`.
  - Value bound to `split.deliveryFee ?? 0`.
  - `onChange` calls `onUpdateSplit(index, { deliveryFee: parsed })` where `parsed = isNaN ? 0 : Math.max(0, Number(value))`.
- Add a tiny "Reset to suburb rate" link button:
  - Visible only when a suburb is resolved for the split.
  - On click: re-fetch the suburb via `fetchSuburbData` and call `onUpdateSplit(index, { deliveryFee: parseDeliveryRate(data.delivery_rate) })`.
- Replace the helper text with: `"Auto-set from suburb rate — edit to override (use 0 for free delivery)."`

### Why this is enough
- Split totals already read `split.deliveryFee` (see `MultiStepOrderForm` effect that sums `splits.reduce(... + (split.deliveryFee || 0) ...)` into the order's `deliveryFee`).
- The auto-population effect in `MultiStepOrderForm` only fills a split when its `deliveryFee` is `undefined` or `0` and a suburb is set. To prevent it from overwriting an explicit `$0`, we track manual edits with a per-split flag.

### Manual-override flag
- Extend `SplitConfig` (in `src/components/order/types.ts`) with an optional `deliveryFeeManual?: boolean`.
- In the new input's `onChange`, set `{ deliveryFee: parsed, deliveryFeeManual: true }`.
- In "Reset to suburb rate", set `{ deliveryFee: suburbFee, deliveryFeeManual: false }`.
- Update the auto-populate effect in `MultiStepOrderForm.tsx` to skip any split where `deliveryFeeManual === true` (one extra condition in the `needsUpdate` check and the loop).

## Out of scope
- No DB schema changes (per-split delivery fees already persist via the existing split-order creation path).
- No changes to single-order delivery fee UI, common-mode toggles, or split totals math.
- No changes to receipts/reports — they already read the stored fee.

## Files touched
1. `src/components/order/CompactSplitConfig.tsx` — editable fee input + reset button.
2. `src/components/order/types.ts` — add `deliveryFeeManual?: boolean` to `SplitConfig`.
3. `src/components/order/MultiStepOrderForm.tsx` — respect `deliveryFeeManual` in the auto-populate effect.
