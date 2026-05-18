## Goal

1. Step 3 (Delivery Method): clicking Delivery or Yard Sale/Pickup auto-advances to the next step — no Continue button.
2. Step 4 (Order Type): clicking Single or Split auto-advances to the next step — no Continue button.
3. Pickup orders can be Split (same UX as delivery split) but with **no address fields** — each split keeps its own date/time/instructions only.

## New unified flow (both delivery and pickup → 7 steps)

```
1 Customer → 2 Products → 3 Method → 4 Order Type → 5 Logistics → 6 Payment → 7 Review
```

Step 5 ("Logistics") branches by combination:

| Method   | Type   | Step 5 component                                  |
|----------|--------|---------------------------------------------------|
| delivery | single | DeliveryAddressStep (today)                       |
| delivery | split  | SplitOrderConfigurationStep (today)               |
| pickup   | single | PickupSchedulingStep (today, moved from step 4)   |
| pickup   | split  | SplitOrderConfigurationStep (new pickup variant)  |

This removes the current pickup-skips-Order-Type branch.

## Changes

### 1. `DeliveryMethodSelectionStep.tsx`
- Remove the Continue button and the Back button row (keep Back only).
- On card click → call `onDeliveryMethodChange(method)` AND `onNext()` in the same handler.
- Add a tiny delay (`setTimeout(onNext, 0)`) so React commits the state update before navigating, since `getTotalSteps()` reads `deliveryMethod`.

### 2. `OrderTypeSelectionStep.tsx`
- Remove the Continue button and the "Selected Order Type" confirmation panel (no longer needed since we advance immediately).
- On card click → `onOrderTypeChange(type)` then `onNext()`.
- Keep Back button.
- Keep the split-mode Info alert (still useful before the click registers? — actually it's gone with auto-advance; remove it).

### 3. `MultiStepOrderForm.tsx` — restructure step routing
Switch from "delivery has 7 steps, pickup has 5" to a single 7-step flow:

```ts
case 4: // Order Type — for BOTH delivery and pickup
  return <OrderTypeSelectionStep ... />;

case 5: // Logistics
  if (orderType === "split") {
    return <SplitOrderConfigurationStep
      cart={cart} splits={splits} customer={selectedCustomer}
      isPickup={deliveryMethod === "pickup"}   // NEW prop
      onSplitsChange={setSplits} onCartChange={setCart}
      onBack={prevStep} onNext={nextStep} />;
  }
  if (deliveryMethod === "pickup") {
    return <PickupSchedulingStep ... />;        // moved here from case 4
  }
  return <DeliveryAddressStep ... />;           // delivery + single

case 6: // Payment — unified for all paths
  return <PaymentMethodStep ... />;

case 7: // Review — unified
  return <OrderReviewStep ... />;
```

Remove the pickup-specific branches that previously lived in case 4/5/6.

### 4. `useOrderFormState.ts`
- `getTotalSteps()` → always return `7`.
- `handleDeliveryMethodChange("pickup")` — stop forcing `orderType = "single"`. Keep clearing `manualDeliveryFee`, `selectedSuburbId`, `sameAsBilling = true`. Allow Split for pickup.

### 5. `ProgressIndicator.tsx`
- Single 7-label set for both methods: `Customer, Products, Method, Order Type, Logistics, Payment, Review` (rename "Address" → "Logistics" so it covers Address / Pickup / Splits).

### 6. `SplitOrderConfigurationStep.tsx` — add `isPickup` prop
- Forward `isPickup` to `SplitConfigurationManager` → `CompactSplitConfig`.
- In `canProceed()`: when `isPickup`, drop the `hasAddressInfo` check; require only `hasDateAndTime` per split (plus product allocation rules unchanged).
- Hide the "billing address missing" alert when `isPickup`.

### 7. `CompactSplitConfig.tsx` — accept `isPickup` prop
- When `isPickup === true`:
  - Hide the entire **Delivery Address** block (Same-as-billing toggle, EnhancedAddressInput, SuburbSelector).
  - Hide the **Delivery Fee** badge.
  - Hide the "Custom Address" badge in the accordion header.
- `isSplitConfigComplete()` ignores address when `isPickup` (date + time + products only).

### 8. Backend / order creation
- **No changes required.** `orderCreationService.createSplitOrder` already branches on `isPickup` (sets `pickupAddress`, `splitDeliverySuburbId = null`, `splitDeliveryFee = 0`, status from `pickupTiming`). Verified in lines 372-400 and 533-575.
- The split-order delivery-fee `useEffect` in `MultiStepOrderForm` is already guarded by `deliveryMethod === 'delivery'`, so pickup splits stay at $0 total.

### 9. Pickup timing for splits
- Pickup timing (`now` vs `scheduled`) is currently order-level via `PickupSchedulingStep`. For a pickup **split** order we skip that screen entirely, so default `pickupTiming` stays `"scheduled"` (which is the existing default). Each split provides its own date/time — same behavior as scheduled delivery splits. No new state needed.
- The "Pick up now → immediate delivered status" shortcut therefore only applies to single pickup orders. This matches today's behavior and avoids per-split status complexity.

## Out of scope

- No DB migrations, RPC, or edge function changes.
- No changes to the merged-stages report work, order edit flow, driver portal, or pipeline columns.
- Stage 4/5 merge discussion remains separate.

## Risks

- Auto-advance after clicking a card: users can no longer change their mind on the same screen. Mitigation: existing clickable ProgressIndicator already lets them jump back.
- Existing in-flight drafts saved in sessionStorage with `currentStep: 4` (pickup = Pickup Scheduling under old flow) will now land on Order Type — acceptable, draft restore still works and the user can advance.
