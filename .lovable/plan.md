

## Plan: Apply Delivery Markup in Suburb Selector and Order Flow

### Problem
Two issues visible in the screenshots:
1. **SuburbSelector** displays the raw database rate (e.g., "AU$50 (estimate)") without applying the configured delivery markup ($5 fixed → should show AU$55)
2. The auto-populated delivery fee in the review step shows $50 instead of $55 because the suburb selector passes the raw rate

### Changes

**1. `src/components/order/SuburbSelector.tsx`**
- Import `usePaymentSettings` hook
- Apply markup calculation to the displayed delivery rate in `getSuburbLabel`
- Show the effective rate (with markup) instead of raw `delivery_rate`

**2. Verify `useDeliveryFeeCalculation.ts` integration**
The hook already applies markup correctly via `applyMarkup()`. The issue is that the SuburbSelector display doesn't match what gets auto-populated, and the suburb object passed to callbacks contains the raw rate. The auto-populate toast says $55 but the selector shows $50.

### Files Modified
1. `src/components/order/SuburbSelector.tsx` — show effective rate with markup applied

