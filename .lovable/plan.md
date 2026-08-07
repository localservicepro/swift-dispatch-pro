# Per-split delivery price (including $0)

## Current state (verified)

Per-split delivery fee editing already ships in the split configuration step:

- `CompactSplitConfig.tsx` renders an editable "Delivery Fee" number input per split, marks it `deliveryFeeManual: true` on edit, and offers a "Reset" button to fall back to the suburb rate.
- `MultiStepOrderForm.tsx` auto-calculation skips any split flagged `deliveryFeeManual`, so a typed value (including `0`) is not overwritten.
- `orderCreationService.ts` trusts a manual override verbatim on save, so `$0` persists as free delivery.

Two real gaps remain.

## Gap 1 — the fee editor is hidden until a suburb is set

The input only renders when the split has a delivery suburb (or uses the billing suburb). If staff want to set a fee (or $0) before/without a suburb match, there is no field at all.

Fix: always render the fee row for delivery splits. When no suburb is resolved, show it with a hint that no suburb rate is available and the typed value will be used as-is.

## Gap 2 — the Review step can't override the fee

`SplitEditPopovers.tsx` recalculates the fee from the suburb whenever the address changes, but offers no manual amount field. Editing an address on the final step silently discards a $0/custom fee set earlier.

Fix: add the same amount input + Reset control to the split edit popover on the Review step, writing `deliveryFee` / `deliveryFeeManual` through the existing `onUpdateSplit`. When a split is already flagged manual, changing its address updates the address but leaves the manual fee intact.

## Technical notes

- No schema or pricing-logic changes. Only the two presentation components change; the save path in `orderCreationService.ts` already handles overrides correctly.
- `0` must be treated as a valid value everywhere (no `|| suburbFee` fallbacks) — guards use `deliveryFeeManual`, not truthiness of the amount.
- Split totals continue to sum through the existing `MultiStepOrderForm` aggregation, so the order total reflects a $0 split immediately.
