

## Fix: Manual delivery fee override is ignored when creating an order

### What's broken

ORD-840661: admin manually changed the delivery fee from the suburb's $55 default down to $20, clicked Create Order, and the saved row in the DB has `delivery_fee = $55` and `total_amount = $245`. The manual edit was silently thrown away.

### Root cause

The recent "server-authoritative delivery fee" fix (introduced to stop $0 silent undercharges) is too aggressive. In `createSingleOrder` it ALWAYS looks the suburb up in the `suburbs` table and overrides the client-supplied fee whenever the two differ — even when the admin deliberately edited it. The `isDeliveryFeeManuallySet` flag exists in `useOrderFormState` and is shown in the UI ("Manually set" badge), but it's never passed to `createSingleOrder`, so the server can't tell an intentional override apart from a stale/zero value.

### The fix

**1. `src/components/order/services/orderCreationService.ts`**

- Add `isDeliveryFeeManuallySet?: boolean` to `CreateSingleOrderParams`.
- In the authoritative-fee block: if `isDeliveryFeeManuallySet === true` AND `clientDeliveryFee >= 0`, trust the client value and skip the suburbs-table lookup. Log "using manually set delivery fee (admin override)" for traceability.
- Otherwise behaviour is unchanged: recompute from suburbs, throw if the result is $0 for a delivery order with a suburb (the original undercharge guard stays intact).

**2. `src/components/order/MultiStepOrderForm.tsx`**

- Pass `isDeliveryFeeManuallySet` (already available from `useOrderFormState`) into the `createSingleOrder({ ... })` call.

**3. Split orders — minimal change**

`createSplitOrder` has the same override behaviour per split. To match single-order behaviour: in the per-split fee loop, if the client-supplied `split.deliveryFee` is `> 0` AND differs from the server fee by more than $0.01, treat it as a manual override and trust the client value (still log a `console.warn` so we can see it in logs). The "throw on $0 with a valid suburb" guard stays — that's the original undercharge fix.

This keeps the bug-fix that prevents silent $0 fees, while restoring the admin's ability to set any custom fee.

### Behaviour matrix after fix

| Scenario | Saved fee |
|---|---|
| Admin leaves auto-populated $55 | $55 (server confirms) |
| Admin edits to $20 ("Manually set" badge) | **$20** (respected) |
| Admin edits to $0 with a delivery suburb selected | Throws — must reselect suburb |
| No suburb, fee = $0 | $0 (allowed) |
| Pickup order | $0 |

### Note on the existing bad order

ORD-840661 is already saved at $55 and won't be auto-corrected by this fix. You'll need to edit it from Order Management to apply the $20 manually.

### Files

- `src/components/order/services/orderCreationService.ts` — add manual-override branch in single-order fee logic; relax split-order override when client fee > 0.
- `src/components/order/MultiStepOrderForm.tsx` — pass `isDeliveryFeeManuallySet` into `createSingleOrder`.

