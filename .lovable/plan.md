## Fix: Delivery fee stays $0 when "Use registered address" is ticked

### What's broken

In Create Order → Address step, ticking **"Use Jay's registered address"** copies the customer's address and suburb (3150 Glen Waverley) into the form, but the **Delivery Fee in Order Summary stays at $0** — even though the suburb dropdown clearly shows `$55.00 (estimate)`. The user then has to manually retype 55 to fix it.

### Root cause

`resetToCustomerAddress()` in `src/components/order/hooks/useOrderFormState.ts` (line 219) sets the suburb directly:

```ts
setSelectedSuburbId(selectedCustomer.suburb_id);
```

This bypasses `handleSuburbChange()`, which is the only place that calls `autoPopulateDeliveryFee(...)` to look the suburb's `delivery_rate` up and push it into `manualDeliveryFee`. Result: suburb id changes, but the fee state never updates from its initial `0`.

The same gap exists for **picking a suburb manually from the dropdown inside the Address step** if it is ever wired straight to `setSelectedSuburbId` — confirmed `OrderAddressForm` already routes through `handleSuburbChange`, so only the "use registered address" path is broken.

### Fix

In `src/components/order/hooks/useOrderFormState.ts`, change `resetToCustomerAddress()` to route the suburb through `handleSuburbChange()` so the auto-populate flow runs:

```ts
const resetToCustomerAddress = () => {
  if (!selectedCustomer?.full_address) return;
  setDeliveryAddress(selectedCustomer.full_address);
  setIsUsingCustomerAddress(true);
  setSameAsBilling(true);

  if (selectedCustomer.suburb_id) {
    // Use the same path as the suburb dropdown so the delivery fee is
    // auto-populated from the suburb's delivery_rate (incl. markup).
    handleSuburbChange(selectedCustomer.suburb_id);
  }
};
```

Also clear `isDeliveryFeeManuallySet` first so a stale manual-set lock from an earlier session can't suppress the auto-populate (`handleSuburbChange` already re-populates whenever `suburbChanged`, but if the user toggles the checkbox off-and-on with the same suburb id the flag would still be true — explicit reset is safer).

### Acceptance

1. Customer has registered suburb 3150 Glen Waverley with `$55` delivery rate.
2. Open Create Order → Address step.
3. Tick **Use Jay's registered address** → Order Summary **Delivery Fee = $55.00** (was $0), GST/total recalculate accordingly.
4. Untick → fee resets to $0 (existing behaviour).
5. Manually editing the fee after ticking still works and is preserved on Create Order (existing manual-override fix from the previous task).

### Files

- `src/components/order/hooks/useOrderFormState.ts` — fix `resetToCustomerAddress`.
