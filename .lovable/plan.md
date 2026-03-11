

## Plan: Show Marked-Up Delivery Rates in Suburb Table

### Problem
The suburb table displays raw `delivery_rate` values from the database. When a delivery markup is configured in Payment Settings (e.g., +$5 fixed), the table does not reflect the final rate customers will be charged.

### Changes

**`src/components/suburb/SuburbTable.tsx`**
- Import `usePaymentSettings` hook
- Calculate the effective delivery rate by applying the markup (percentage or fixed) to each suburb's base rate
- Display the effective rate in the table, with a small indicator showing the original base rate when markup is active
- Parse the delivery rate string (strip `AU$` prefix) to apply numeric markup, then format back for display

### Example
With $5 fixed markup:
- Abbotsford base rate `$AU$60` → displays as `$AU$65` (with subtle note showing base $60)

### Files Modified
1. `src/components/suburb/SuburbTable.tsx` — apply markup to displayed delivery rates

