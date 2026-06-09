## Goal
Make Step 5 (Configure Order Splits) more flexible: independently share **address** and/or **date & time** across all splits, and let users edit per-split date/time inline on the Product Allocation view when only the address is shared.

## Changes

### 1. `SplitControlsHeader.tsx`
Replace the single `Same date, time & address for all` checkbox with **two independent toggles** stacked compactly:
- `Same address for all`
- `Same date & time for all`

Props change:
- Remove: `useSameDateForAll`, `onSameDateToggle`
- Add: `useSameAddress`, `onSameAddressToggle`, `useSameDateTime`, `onSameDateTimeToggle`

Short helper text under each: "One address for every split" / "One date and time for every split".

### 2. `CommonDateTimeSelector.tsx`
Split into conditional sections rendered based on which toggle is on:
- Render the **Common Date + Common Time** block only when `showDateTime` is true.
- Render the **Common Delivery Address** block only when `showAddress` is true.
- If neither is true, the component returns null (and parent won't render it).

Add props: `showDateTime: boolean`, `showAddress: boolean` (replacing current implicit "all-or-nothing" behavior). Keep all existing date/time/address handlers.

### 3. `SplitConfigurationManager.tsx`
- Replace state `useSameDateForAll` with two booleans: `useSameAddress` and `useSameDateTime`.
- `applyCommonToAllSplits` accepts a `scope: { dateTime?: boolean; address?: boolean }` so each handler only writes the fields its toggle controls. This prevents address handlers from overwriting per-split dates and vice versa.
- Toggle handlers:
  - `handleSameAddressToggle(checked)` → if on, apply only address fields to every split.
  - `handleSameDateTimeToggle(checked)` → if on, apply only date + time to every split.
- Date/time change handlers only propagate when `useSameDateTime` is true; address handlers only propagate when `useSameAddress` is true.
- Pass `isCommonAddressMode={useSameAddress}` and `isCommonDateTimeMode={useSameDateTime}` to `CompactSplitConfig` (replacing the single `isCommonDateMode`).

### 4. `CompactSplitConfig.tsx`
- Replace prop `isCommonDateMode` with two props: `isCommonDateTimeMode` and `isCommonAddressMode`.
- Hide per-split **date & time** inputs only when `isCommonDateTimeMode` is true (currently they hide whenever the combined toggle is on).
- Hide per-split **address editor** only when `isCommonAddressMode` is true.
- Show the existing "Using common address" summary row only when `isCommonAddressMode` is true.
- This naturally enables the "same address, different date/time" workflow: each split card keeps its own date/time pickers while the address is locked to the common value.

### 5. `SplitOrderConfigurationStep.tsx`
No prop changes needed — it passes `splits` through unchanged. Validation logic already checks per-split `deliveryDate`/`deliveryTime`, which still works because they're populated either by the common toggle or by per-split editors.

## UX result
| Same address | Same date/time | Behavior |
|---|---|---|
| off | off | Fully independent splits (current default) |
| on  | on  | Today's "all common" experience |
| on  | off | **New** — one address, each split picks its own date/time inline |
| off | on  | One date/time, each split picks its own address |

## Out of scope
- No changes to delivery fee logic — still full suburb rate per split.
- No backend / schema changes.
- No changes to validation rules in `SplitOrderConfigurationStep`.