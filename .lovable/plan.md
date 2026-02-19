
## Fix Delivery Fee Not Calculating Properly

### Problems Found

**Problem 1: Split orders always show $0 delivery fee**
When splits are created with `sameAsBilling: true`, the code tries to look up the suburb using `split.suburbId`, but this property is never set on the split object. The customer's `suburb_id` should be used instead.

**Problem 2: Single order delivery fee gets blocked after split order calculations**
In `MultiStepOrderForm.tsx`, the effect that sums split delivery fees calls `setManualDeliveryFee()` which goes through `handleManualDeliveryFeeChange` -- this sets `isDeliveryFeeManuallySet = true`, which then blocks future auto-population for single orders.

---

### Fix 1: `src/components/order/CompactSplitConfig.tsx`

**Lines 86-100** - Fix the useEffect to use the customer's suburb_id when `sameAsBilling` is true, instead of the non-existent `split.suburbId`:

```typescript
useEffect(() => {
  splits.forEach(async (split, index) => {
    const suburbId = split.deliverySuburbId || (split.sameAsBilling && customer?.suburb_id ? customer.suburb_id : null);
    if (suburbId && split.deliveryFee === undefined) {
      const suburbData = await fetchSuburbData(suburbId);
      if (suburbData) {
        const deliveryFee = parseDeliveryRate(suburbData.delivery_rate);
        if (deliveryFee > 0) {
          onUpdateSplit(index, { deliveryFee });
        }
      }
    }
  });
}, [splits.map(s => s.deliverySuburbId || s.suburbId).join(','), customer?.suburb_id]);
```

Also fix **line 275** (delivery fee display condition) to use customer's suburb_id:
```typescript
{(split.deliverySuburbId || (split.sameAsBilling && customer?.suburb_id)) && (
```

### Fix 2: `src/components/order/MultiStepOrderForm.tsx`

**Lines 91-100** - Fix the split order delivery fee sum to avoid marking the fee as "manually set", which would block auto-population. Use the raw state setter instead of the handler:

The current code calls `setManualDeliveryFee(totalDeliveryFee)` which triggers `handleManualDeliveryFeeChange` and sets `isDeliveryFeeManuallySet = true`. We need to expose a way to set the delivery fee without marking it as manual.

### Fix 3: `src/components/order/hooks/useOrderFormState.ts`

Add and expose a `setDeliveryFeeFromSplits` function that sets the fee without marking it as manually set:

```typescript
const setDeliveryFeeFromSplits = (fee: number) => {
  setManualDeliveryFee(fee);
  setIsDeliveryFeeManuallySet(false);
};
```

Then in `MultiStepOrderForm.tsx`, use `setDeliveryFeeFromSplits` instead of `setManualDeliveryFee` for the split total calculation.

---

### Expected Result
- Single orders: Selecting a suburb (e.g., Blackburn at $45) will correctly auto-populate the delivery fee
- Split orders: Each split using "same as billing" will automatically fetch the customer's suburb delivery rate and show it (e.g., $45 for Blackburn)
- The total delivery fee for split orders will correctly sum all split fees
