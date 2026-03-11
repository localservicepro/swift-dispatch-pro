

## Plan: Add Delivery Markup to Payment Settings

### Database Change
Add two new columns to `payment_settings`:
- `delivery_markup_type` (text, default `'percentage'`) — either `'percentage'` or `'fixed'`
- `delivery_markup_value` (numeric, default `0`) — the markup amount

### UI Change — `src/components/payment/PaymentSettings.tsx`
Add a "Delivery Markup" section under the existing "General Settings" area:
- A radio/select toggle for markup type (Percentage vs Fixed Amount)
- An input field for the value (shows "%" suffix for percentage, "$" for fixed)
- Helper text explaining the markup applies to all delivery fees

### Logic Change — `src/hooks/useDeliveryFeeCalculation.ts`
Update `autoPopulateDeliveryFee` and `getAutoDeliveryFee` to fetch payment settings and apply the markup on top of the suburb's base delivery rate:
- Percentage: `fee = baseFee + (baseFee * markupValue / 100)`
- Fixed: `fee = baseFee + markupValue`

### Hook Change — `src/hooks/usePaymentSettings.ts`
Add `delivery_markup_type` and `delivery_markup_value` to the interface and default values.

### Files Modified
1. **Migration** — add columns to `payment_settings`
2. `src/components/payment/PaymentSettings.tsx` — add markup UI fields
3. `src/hooks/usePaymentSettings.ts` — add new fields to interface/defaults
4. `src/hooks/useDeliveryFeeCalculation.ts` — apply markup when calculating fees

