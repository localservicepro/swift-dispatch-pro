

## Fix junk/null customer name display in Orders

### Problem
Two display issues visible in the screenshots:
1. **Order card shows `***`** as customer name — junk placeholder data stored in `customer_name` field is not being filtered
2. **"Ahmed null"** appears in both the order card contact line and the Edit Order header — the literal string "null" was concatenated as a last name when it was actually null

### Root Cause
- The `getDisplayInfo()` function in `OrderCard.tsx` does not apply the same junk-value filtering (`isJunkValue`) that exists in `orderFormattingService.ts`
- The `OrderEditHeader.tsx` displays `customerName` directly without filtering
- The `customer_name` field stored in orders sometimes contains junk values like `***` or names with literal "null"

### Plan

**1. Create a shared name-cleaning utility**
Extract the `isJunkValue`/`clean` logic from `orderFormattingService.ts` into a reusable helper, or simply import and reuse it.

**2. Fix `OrderCard.tsx` — `getDisplayInfo()` (lines 122-163)**
- Apply junk filtering to `customer_name`, `company_name`, `business_name`, and `contact_name`
- Filter out literal "null" strings and clean "Ahmed null" → "Ahmed"
- When `customer_name` is junk (like `***`), fall back to contact_name or company/business name

**3. Fix `OrderEditHeader.tsx` — display name (line 16, 29)**
- Apply the same junk/null cleaning to `customerName` and `companyName` before display
- Clean literal "null" from concatenated names (e.g., "Ahmed null" → "Ahmed")

**4. Fix contact info line in `OrderCard.tsx` (line 286)**
- Apply cleaning to `contactInfo` so "Ahmed null" displays as "Ahmed"

### Files to modify
- `src/components/order/services/orderFormattingService.ts` — export `isJunkValue`/`clean` helpers
- `src/components/order/OrderCard.tsx` — apply cleaning in `getDisplayInfo()`
- `src/components/order/OrderEditHeader.tsx` — apply cleaning to displayed names

