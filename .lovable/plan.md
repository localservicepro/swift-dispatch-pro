

## Fix: Delivery fee dropping to $0 on some orders → undercharged customers

### What's happening

Today's orders include real cases where `delivery_method = 'delivery'`, a valid `delivery_suburb_id` is saved, but `delivery_fee = 0` and `total_amount` is missing the delivery charge. Examples from the last 72 hours:

| Order | Suburb | Suburb rate | Saved delivery_fee | Loss |
|---|---|---|---|---|
| ORD-741594 | Box Hill South | $40 | **$0** | -$40 |
| ORD-648169 | Burwood | $40 | **$0** | -$40 |
| ORD-282651 | Murrumbeena | $60 | **$0** | -$60 |
| ORD-464522 | Mont Albert | $40 | **$0** | -$40 |
| ORD-229823 | Bulleen | $50 | **$0** | -$50 |
| ORD-152231-A | Eltham (split) | $70 | **$0** | -$70 |
| ORD-124513-A | Balwyn North (split) | $40 | **$0** | -$40 |

The screenshot shows the bug live: suburb dropdown reads `3146 Glen Iris – $45.00 (estimate)`, but the **Delivery Fee** input next to it reads `0`. The order would be confirmed at the wrong total.

### Root cause

Delivery fee lives in **client React state only** (`manualDeliveryFee` in `useOrderFormState.ts`). Three independent client paths keep it in sync with the suburb, and any one of them silently failing leaves the fee at `0`:

1. **`handleSuburbChange`** auto-populates the fee, but only when `!isDeliveryFeeManuallySet`. The flag goes `true` the moment anyone touches the fee input — and the order draft is now persisted to `sessionStorage` (added with the recent session-expiry fix), so the flag survives reloads, sign-outs, and crashes. After that, changing the suburb never refreshes the fee.
2. **`autoPopulateDeliveryFee`** does `fetchSuburbData(...).then(...)` with no await and no submit gating. If the admin clicks "Continue" / "Confirm Order" before the async fetch resolves, the fee stays at its previous value (often `0`).
3. **`handleDeliveryFeeChange`** in `OrderReviewStep` does `parseFloat(e.target.value) || 0`. The instant the admin clears the field to retype a number, the value becomes `0` **and** `isDeliveryFeeManuallySet` flips to `true`, locking the `0` in.

`createSingleOrder` and `createSplitOrder` then trust that client value verbatim and write it to the DB. There is no server-side recompute and no "fee must be > 0 for a delivery order" guard — exactly the same class of bug we just fixed for fuel surcharge, but for delivery fee.

### The fix — make the server authoritative for delivery fee (same pattern as fuel surcharge)

**`src/components/order/services/orderCreationService.ts`**

For `createSingleOrder`:
- After fetching `paymentSettings`, also fetch the row from `suburbs` for the chosen `delivery_suburb_id` (single round-trip) to get `delivery_rate`.
- Compute `authoritativeDeliveryFee` server-side: parse `delivery_rate` (strip `AU$` / spaces) and apply `paymentSettings.delivery_markup_value` / `delivery_markup_type` — identical math to `useDeliveryFeeCalculation.applyMarkup`.
- If the client-supplied `params.orderTotals.deliveryFee` differs by more than 1¢ from the server value, **use the server value** and `console.warn` the discrepancy (same shape as the existing fuel-surcharge log).
- For `delivery` orders with a valid suburb, if the computed fee is `0` (suburb has empty/invalid `delivery_rate`), throw a `Error('Delivery fee could not be determined for the selected suburb. Please reselect the suburb.')` so the order is **never** silently saved at $0.
- Recompute `authoritativeTotal` from the server-trusted subtotal + adjustments + delivery fee + fuel surcharge, then insert.

For `createSplitOrder`:
- Do the same per-split: for each split with `delivery_method = 'delivery'`, look up its suburb (`split.deliverySuburbId || split.suburbId`, falling back to `customer.suburb_id` when `sameAsBilling`) and recompute that split's delivery fee server-side.
- Sum the per-split server fees into `totalDeliveryFee` instead of trusting `splits[i].deliveryFee`.
- Same "must be > 0 for delivery splits with a suburb" guard.

Batch the suburb lookups into one `select * from suburbs where id in (...)` to keep this to two extra round-trips total (settings + suburbs).

**`src/components/order/hooks/useOrderFormState.ts`**

Two small client-side hardenings so the UI matches the server's behaviour:

- `handleSuburbChange`: drop the `!isDeliveryFeeManuallySet` guard when the suburb actually changes — changing suburb is an explicit user action and should always re-populate the fee. Keep the manual-edit flag respected only for fee input edits, not suburb changes.
- `handleManualDeliveryFeeChange`: treat an empty input as "leave previous value alone" rather than collapsing to `0`. Only mark `isDeliveryFeeManuallySet = true` when the parsed value is a real number ≥ 0 from a non-empty string.

**`src/components/order/OrderReviewStep.tsx`**

- Disable the "Confirm Order" button when `deliveryMethod === 'delivery'` && `deliveryFee <= 0` && a suburb is selected, with a small inline warning ("Delivery fee not set — please reselect the suburb"). This is a belt-and-braces UI guard; the server check above is the real safety net.

### Files to change

- `src/components/order/services/orderCreationService.ts` — server-side delivery-fee recompute + zero-fee guard for both single and split paths.
- `src/components/order/hooks/useOrderFormState.ts` — always re-populate fee on suburb change; don't collapse cleared input to `0`.
- `src/components/order/OrderReviewStep.tsx` — block submit + warn when fee is `0` for a delivery order with a chosen suburb.

### Result

- Delivery orders can no longer be saved with `delivery_fee = 0` when a valid suburb is selected — the server recomputes from the suburbs table on every insert.
- The seven recent under-charged orders above won't repeat, and any future race between async suburb lookup and "Confirm" click is caught server-side.
- The reviewer screen can't submit a $0 delivery fee accidentally; admins get a clear inline message instead of an under-billed order.
- Existing under-charged orders are not auto-fixed (they're already created); we'll surface a follow-up list of the seven orders so you can re-invoice manually if needed.

