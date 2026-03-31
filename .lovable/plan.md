

## Show business name for trade/residential customers with business entity type

### Problem
When a trade customer has `entity_type = 'business'` and a `company_name` or `business_name` (e.g. "Ficorilli Landscapes"), the display name logic ignores it and shows the personal name ("Adrian Ficorilli") instead. This makes it confusing when searching by business name — the search matches but the card shows a different name.

### Fix
Update `getCustomerDisplayName` in `src/components/order/services/orderFormattingService.ts` to prioritize company/business name for any customer with `entity_type === 'business'`, not just account customers.

**Current logic (line 28-35):**
- Account + company name → show company name
- Non-account → always show personal name

**New logic:**
- Account + company name → show company name
- Any entity_type "business" + company/business name → show company/business name
- Otherwise → show personal name

### File to change
- `src/components/order/services/orderFormattingService.ts` — reorder the priority in `getCustomerDisplayName` so business entity types show their company name regardless of customer type

