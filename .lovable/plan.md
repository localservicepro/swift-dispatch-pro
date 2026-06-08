## Goal

Make split-order configuration faster and less error-prone when multiple splits share a destination, while guaranteeing each split's delivery fee remains the **full suburb rate** (never divided across splits).

## Changes

### 1. Rename + extend the "Same date/time" toggle → "Same date, time & address"

File: `src/components/order/SplitControlsHeader.tsx`
- Update the checkbox label to **"Same date, time & address for all"**.
- Keep prop name backwards compatible; just relabel.

File: `src/components/order/SplitConfigurationManager.tsx`
- When `useSameDateForAll` is toggled ON:
  - Propagate `deliveryDate`, `deliveryTime` (existing behaviour).
  - Also propagate `sameAsBilling`, `deliveryAddress`, `deliverySuburbId`, `suburbId` from a single "common" source to every split.
- Add common address state alongside `commonDeliveryDate` / `commonDeliveryTime`:
  - `commonSameAsBilling` (default true)
  - `commonDeliveryAddress`, `commonDeliverySuburbId`
- When user changes any common field while toggle is ON, fan it out to every split via `onSplitsChange`.
- When toggle is turned OFF, splits keep their last values and become independently editable again (no reset).

File: `src/components/order/CommonDateTimeSelector.tsx`
- Rename internal usage to "Common Delivery Details".
- Add an address row beneath the date/time grid:
  - Toggle button "Use Billing Address" / "Use Different Address" (same pattern as `CompactSplitConfig`).
  - When custom: render `EnhancedAddressInput` + `SuburbSelector`.
- Emit new callbacks: `onSameAsBillingToggle`, `onAddressChange(addressData)`, `onSuburbChange(suburbId)`.
- Accept `customer` prop to support billing address display.

### 2. Hide per-split address/date/time editors when common mode is ON

File: `src/components/order/CompactSplitConfig.tsx`
- When `isCommonDateMode` is true:
  - Hide the per-split Delivery Address block (already hides date/time).
  - Show a small read-only summary chip: "Using common address: {address}".
- Keep Special Instructions per-split (these are intentionally per-split per existing memory).

### 3. Realtime per-split delivery fee — confirm "no division"

Current behaviour (verified in `MultiStepOrderForm.tsx` lines 129–179 and `CompactSplitConfig.tsx` lines 80–89) already:
- Fetches the suburb's `delivery_rate` per split.
- Stores the **full** fee on each split (`split.deliveryFee = parseDeliveryRate(...)`).
- Sums splits into the order's total delivery fee — never divides.

Tightening to make this realtime and obvious:
- In `SplitConfigurationManager.handleCommonSuburbChange`: when common-mode address/suburb changes, fetch the suburb once and write the **same full fee** to every split (e.g. $45 each → $45 × N total). Add a small helper note in `CommonDateTimeSelector`: *"Delivery fee applies per split (not divided)."*
- In `CompactSplitConfig`'s fee display badge (lines 268–283), change the caption to:
  *"Full suburb rate — charged per split"* so users understand each $45 stays $45.
- Trigger fee recalculation when:
  - Common suburb changes (fan-out).
  - Individual split suburb changes (existing).
  - `isCommonDateMode` is toggled ON (resync all splits to the common suburb's fee).

### 4. Polish for a smoother split-order flow

- `SplitControlsHeader`: group controls into two rows on small screens; keep one row on desktop. Add a subtle helper line under the toggle: *"Turn on to set one date, time and address for every split."*
- Add a "Copy from Split 1" link in each subsequent split header (only visible when common-mode is OFF) that copies date, time, address, and suburb from Split 1 to that split — a faster path than enabling/disabling the common toggle.
- Validation badge: in the accordion trigger, show an amber dot when a split is missing address/date/time so users see incomplete splits at a glance.
- Ensure `SplitOrderConfigurationStep.canProceed()` still passes — no logic change needed; common-mode just writes the same values into each split.

## Out of scope

- No DB schema changes.
- No change to how the final order total is calculated (already sum of per-split fees).
- No change to single-order (non-split) flow.

## Validation

- Toggle "Same date, time & address" ON → set date, time, billing-address suburb with $45 rate across 3 splits → Review step shows 3 × $45 = $135 delivery fee.
- Change common address to a $60 suburb → all 3 splits update to $60 (total $180) without page reload.
- Toggle OFF → edit Split 2's address to a different suburb ($30) → totals = $60 + $30 + $60 = $150.
- Pickup orders: address controls remain hidden (existing behaviour preserved).
