

## Fix: Customer Name Display for Trade and Residential Types

### Problem
The `getCustomerDisplayName` function (in `orderFormattingService.ts`) returns `business_name` before checking `first_name`/`last_name` for ALL customer types. Trade and residential customers that happen to have a `business_name` field populated (often with placeholder/junk data like ".", "..", "*") display those values instead of the customer's actual name.

### Solution
Reorder the logic so that `first_name`/`last_name` is checked BEFORE `business_name` for non-account customers. Only account customers should prioritize company/business names.

### File Change: `src/components/order/services/orderFormattingService.ts`

Updated logic:
1. Account customers with `company_name` → show company name (unchanged)
2. **All customers**: check `first_name` + `last_name` first
3. Then fall back to `business_name`, then `company_name`
4. Final fallback: "Customer"

This ensures trade and residential customers always show their personal name when available, while account customers still prioritize their company name.

