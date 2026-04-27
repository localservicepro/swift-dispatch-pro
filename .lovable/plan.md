## Fix: Trade customers with a company name should display like account customers

### What's broken

In **Create New Order → Step 1: Select Customer**, searching for a trade business like "Rival Concrete" returns the customer but shows the contact's personal name as the title (e.g. "Rhett .") with a TRADE badge. The company name "Rival Concrete" is hidden, and there's no contact line below.

For account customers, the same screen correctly shows:
- Company name as the title (with building icon)
- "Contact: <First Last>" line
- Address line

The team wants **trade and any other business-entity customers** to follow the same layout.

### Root cause

In `src/components/order/CustomerSearchStep.tsx`:

- `getCustomerDisplayName()` only promotes `company_name` to the title when `customer_type === 'account'`. Trade customers with a company fall through to the personal name.
- `getCustomerSubtitle()` only emits the "Contact: …" line for accounts.
- The list-row and selected-customer-card icon (`Building2` vs `User`) is also gated on `customer_type === 'account'` only.

This contradicts the project rule that any customer with `entity_type === 'business'` should display the business name as the primary identifier.

### Fix

Update the three helpers / icon checks in `src/components/order/CustomerSearchStep.tsx` to treat **any business-entity customer** (not just accounts) the same way:

1. **`getCustomerDisplayName`** — If `entity_type === 'business'` OR `customer_type === 'account'`, prefer `company_name` (then `business_name`) as the title; fall back to personal name only if neither exists.

2. **`getCustomerSubtitle`** — When the title is the business name and a personal name exists, return `Contact: <First Last>`. Otherwise keep current email fallback.

3. **Building icon** — In both the search-result row (line ~617) and the selected-customer card (line ~512), show `Building2` when the customer is a business entity (`entity_type === 'business' || customer_type === 'account'`), not only for accounts.

4. **"Trading as" line** — The selected-customer detail block currently shows `business_name` only for accounts (line ~539). Extend it to any business-entity customer where `business_name` exists and differs from the title.

### Result

Searching "Rival Concrete" will display:

```
🏢 Rival Concrete                           TRADE
   Contact: Rhett .
   <full address>
```

Account customers continue to render exactly as today (logic is a superset).

### Files

- `src/components/order/CustomerSearchStep.tsx` — update `getCustomerDisplayName`, `getCustomerSubtitle`, the two icon conditionals, and the "Trading as" conditional.

No DB changes. No other components touched — this is an order-creation display-only fix.
