

## Plan: Show Company/Business Name in Customer Orders Title

### Problem
The Customer Orders page title always shows `{first_name} {last_name} - Orders`, even for business/account customers where the company name should be displayed instead.

### Change

**File: `src/components/customer/CustomerOrders.tsx`** (line 76-78)

Update the title logic to prioritize company/business name:
- If `customer.company_name` exists → show company name
- Else if `customer.business_name` exists → show business name
- Else fallback to `{first_name} {last_name}`

This matches the same display logic used in `orderFormattingService.ts` and `OrderCard.tsx`.

### Example Result
- "2 Men and a Shovel - Orders" (instead of "Andrew 0490 137 937 - Orders")
- Contact name shown as subtitle below if different from company name

### Files Modified
1. `src/components/customer/CustomerOrders.tsx` — update title display logic

