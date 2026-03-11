

## Plan: Fix Delivery Fee Not Applying Markup in Order Creation

### Problem
In `src/components/order/hooks/useOrderFormState.ts`, the `handleSuburbChange` function (line 96-114) parses the raw `delivery_rate` from the suburb and sets it directly as the delivery fee — **bypassing the markup calculation entirely**. The `autoPopulateDeliveryFee` from the hook is called only for the toast notification but its calculated fee is never used.

So with a $5 fixed markup: base rate $50 → should be $55, but the form sets $50.

### Fix

**`src/components/order/hooks/useOrderFormState.ts`** — Update `handleSuburbChange` to use the markup-aware calculation from `useDeliveryFeeCalculation` hook instead of raw parsing:

- Instead of manually parsing `suburb.delivery_rate` and setting it directly, call `autoPopulateDeliveryFee` with a callback that actually sets the fee
- Remove the duplicate manual parsing logic (lines 101-112)
- The `autoPopulateDeliveryFee` already applies markup via `applyMarkup()` and shows a toast — just wire it up properly

```typescript
const handleSuburbChange = (suburbId: string, suburb?: any) => {
  setSelectedSuburbId(suburbId);
  
  if (suburb && !isDeliveryFeeManuallySet && deliveryMethod === "delivery") {
    autoPopulateDeliveryFee(suburbId, (fee: number) => {
      setManualDeliveryFee(fee);
      setIsDeliveryFeeManuallySet(false);
    });
  }
};
```

### Files Modified
1. `src/components/order/hooks/useOrderFormState.ts` — fix `handleSuburbChange` to use markup-aware fee calculation

