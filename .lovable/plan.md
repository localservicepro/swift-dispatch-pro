

## Fix: Admin "Create Order" customer search is capped at 1000 customers

### What's happening

You currently have **1,099 active customers**, and Supabase silently returns **at most 1000 rows** for any unbounded `SELECT`. The order-creation customer picker (`CustomerSearchStep`) trips this trap when an admin searches by **phone number**:

```ts
// src/components/order/CustomerSearchStep.tsx (phone branch)
const { data } = await supabase
  .from('customers')
  .select('*, ..., customer_contacts(...)')
  .eq('is_active', true);          // ← no .range(), no server-side phone filter
```

Supabase truncates the result to the first 1000 rows by `id` order, then the code does **client-side** phone matching. So:

- Customers (and their contact phones) past row #1000 never appear when phone-searching.
- The newer the customer, the more likely they're invisible to phone search.
- Only some admins notice it because they're the ones searching unusual numbers — admins who only ever search names hit the text branch, which already runs server-side with `.limit(10)` and is fine.

The text-search branch is fine. The customer-list page (`useCustomersData`) is also fine — it's already paginated 50/page via infinite query.

### Fix — push the phone match to the server (same pattern already used in Order/Customer/Opportunity search)

Rewrite the phone-search branch in `src/components/order/CustomerSearchStep.tsx` to:

1. Use `getPhoneSearchVariants(searchQuery)` to build all the phone formats (e.g. `0409 563 775`, `0409563775`, `+61409563775`, etc.) — same helper already used in `useCustomersData`, `useOrderData`, and `useOpportunitySearchData`.
2. Run **two server-side queries in parallel**, each with an explicit `.limit(50)`:
   - `customers` where any variant matches `phone` ILIKE.
   - `customer_contacts` where any variant matches `phone` ILIKE → collect `customer_id`s.
3. Union the two ID sets, then fetch those customers (with the suburb + contacts joins already in use) in a single `.in('id', ids).limit(50)` query.
4. Drop the client-side `.filter(...)` / `.slice(0, 10)` post-processing — the server has already narrowed it correctly to ≤50 results.

This removes the 1000-row cap entirely (the database does the matching, the client receives only the matches), works regardless of phone formatting, and finds customers via either their main phone **or** any of their contacts' phones.

### Audit of other 1000-row traps

Quick scan of the rest of the codebase confirms the other customer/contact loaders are safe:

- `useCustomersData.ts` — paginated 50/page, OK.
- `useOpportunityData.ts` — has explicit `ACTIVE_HARD_CAP = 2000`, OK.
- `useOpportunitySearchData.ts` — server-side phone variants + `SEARCH_LIMIT = 200`, OK.
- `useOrderData.ts` — server-side phone variants on both `orders` and `customers`, paginated, OK.
- `BulkPinManagementDialog.tsx` — only loads `customer_type = 'account'` (small set), but I'll add an explicit `.range(0, 4999)` defensively so you don't hit this same wall when account customers grow past 1000.

### Files

- Edit `src/components/order/CustomerSearchStep.tsx` — rewrite the `isPhoneNumber(searchQuery)` branch to do server-side variant matching against `customers.phone` + `customer_contacts.phone`.
- Edit `src/components/customer/BulkPinManagementDialog.tsx` — add an explicit upper bound (`.range(0, 4999)`) so it can never silently truncate at 1000.

### Result

- Admins can phone-search any of the 1,099+ customers when creating an order — no more "invisible customer" past the 1000th row.
- Phone search now also finds customers via their **secondary contacts'** phone numbers (matches the behaviour of the Customers tab).
- Search returns in one round-trip with up to 50 results instead of pulling 1000 rows over the wire and filtering them in the browser, so the picker is faster too.

