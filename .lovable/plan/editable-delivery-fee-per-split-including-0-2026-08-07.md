# Editable delivery fee per split (including $0)

## What the screenshot shows

On the Review step, each split's delivery fee is a read-only badge ("Delivery: AU$55.00"). Addresses, date/time and instructions each have a pencil edit control, but the fee does not — so there is no way to set a custom or free ($0) delivery price for a split from this screen, unlike a normal single order.

## What already exists (verified)

- `CompactSplitConfig.tsx` (the split configuration step) already has an editable fee input per split with a "Reset to suburb rate" button, flagging `deliveryFeeManual`.
- `MultiStepOrderForm.tsx` auto-calculation skips splits flagged manual, so a typed value including `0` survives.
- `orderCreationService.ts` trusts a manual override verbatim on save, so `$0` persists as free delivery.

So the save path works; the Review step just doesn't expose the control, and the earlier-step control is hidden when no suburb is resolved.

## Changes

1. **Review step — make the fee badge editable.** Turn each split's "Delivery: AU$xx.xx" badge into a pencil-edit control matching the existing address / date-time / instructions pattern. It opens a small popover with an amount input (min 0, step 0.01) plus a "Reset to suburb rate" action, writing `deliveryFee` and `deliveryFeeManual: true` through the existing `onUpdateSplit`. Manual fees show a small "Custom" marker so staff can see the fee is overridden.

2. **Keep manual fees when the address changes.** `SplitEditPopovers.tsx` currently recalculates the fee from the suburb on every address change. It will only do so when the split is not flagged manual, so a $0/custom fee is not silently overwritten.

3. **Always show the fee field in the split configuration step.** Today it renders only when a suburb is resolved. It will render for every delivery split, with a hint when no suburb rate is available that the typed value is used as-is.

4. **Order Summary reflects it immediately.** The per-split lines and the Delivery Fees total already sum from split values, so a $0 split drops the total the moment it is set.

## Technical notes

- Presentation-layer only: `SplitReviewCard` / `SplitEditPopovers` on the review step and `CompactSplitConfig` on the configuration step. No schema changes, no changes to the pricing/total calculation path or the split save logic.
- `0` is a valid value everywhere — guards key off `deliveryFeeManual`, never truthiness of the amount.
