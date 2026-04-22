

## Fix: Phone search ignores formatting (Orders + Customers)

### Root cause

Phone numbers are stored in the database with spaces (e.g. `0409 563 775`). Both search hooks use `ilike` directly against the stored column, so:

- **Orders tab**: `customer_phone.ilike.%0409563775%` returns nothing because the stored value has spaces. Typing `0409 563 775` works only because it happens to match the stored format exactly.
- **Customers tab**: same bug — `phone.ilike.%<digits>%` never matches a spaced stored phone, so the customer is invisible.

### Fix

Generate **multiple phone variants** from whatever the user types and OR them all into the Supabase query. Variants cover:

- Raw digits (`0409563775`)
- AU mobile format (`0409 563 775`)
- AU landline format (`02 9876 5432`)
- With/without country code (`+61 409 563 775`, `61409563775`)
- The original input as-typed

Both hooks then build an `.or(...)` like `phone.ilike.%v1%,phone.ilike.%v2%,...` so any stored format matches.

### New helper in `src/utils/phoneUtils.ts`

`getPhoneSearchVariants(input: string): string[]` — returns the deduped list of variants above, derived from the normalized digit string. Reuses existing `normalizePhoneNumber`.

### Changes

**1. `src/utils/phoneUtils.ts`** — add `getPhoneSearchVariants()`. Existing `getPhoneVariations` is similar but tied to a stored number; the new helper is search-input oriented (handles partial digit strings ≥4 digits, builds spaced AU formats only when length matches 10 digits).

**2. `src/hooks/useCustomersData.ts`** — in the `isPhoneNumber(q)` branch, replace the single `query.ilike("phone", '%digits%')` with:
```
const variants = getPhoneSearchVariants(q);
const orFilter = variants.map(v => `phone.ilike.%${v}%`).join(',');
query = query.or(orFilter);
```

**3. `src/components/order/hooks/useOrderData.ts`** — when `q` is detected as a phone (add `isPhoneNumber` check at the top of the search branch), build the same variant list and OR it across `customer_phone` and `contact_phone`. Also pre-search `customers` by the same phone variants to capture the `customer_id` so orders linked via the customer record (rather than the denormalized `customer_phone` column) are included. Then merge those IDs into the existing `customer_id.in.(...)` clause.

### Result

- Typing `0409563775`, `0409 563 775`, `409563775`, `+61409563775`, or `61 409 563 775` all return the same matches in both tabs.
- No more "no results" for customers whose phone happens to be stored in a different format than what was typed.
- Orders that reference a customer only via `customer_id` (without a denormalized `customer_phone`) are also surfaced.

### Files modified

- `src/utils/phoneUtils.ts`
- `src/hooks/useCustomersData.ts`
- `src/components/order/hooks/useOrderData.ts`

