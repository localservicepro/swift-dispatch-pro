

## Plan: Paginated, server-side searchable Customers (mirror Order Management)

### Problem

The Customers tab loads via a single `select('*')` from `customers` with no `range()`. Supabase caps queries at 1000 rows, so any customer beyond the first 1000 is invisible — including long-standing account customers — and you can't open them to place an order. Filtering and search currently happen client-side over the same capped 1000.

### Solution

Mirror the proven Order Management pattern: paginated `useInfiniteQuery` with **all filtering and search executed server-side**, so every customer in the database is reachable regardless of total count.

### Changes

**1. New `src/hooks/useCustomersData.ts`** (replaces the inline `useQuery` in `CustomerManagement.tsx`)
- `useInfiniteQuery` with `PAGE_SIZE = 50`.
- Server-side filters built into the Supabase query:
  - `customer_type` → `.eq('customer_type', ...)`
  - `entity_type` → `.eq('entity_type', ...)`
  - `status` → `.eq('is_active', true/false)`
  - Search → `.or(...)` across `first_name`, `last_name`, `company_name`, `business_name`, `email`, `account_number`, plus `suburb_id.in.(...)` from a pre-search of suburbs by name (same two-step trick used in `useOrderData` for company name search).
  - Phone search (detected via `isPhoneNumber`) → strict start/end match per the project's phone-matching rule (memory: phone-matching-logic).
- `.order('created_at', { ascending: false })` then `.range(from, to)`.
- `getNextPageParam` returns next page only when the last page is full.
- Returns `{ customers, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage }`.

**2. `src/hooks/useCustomerFilters.ts`** — convert to a state-only hook
- Keeps `searchTerm`, `customerTypeFilter`, `entityTypeFilter`, `statusFilter`, `activeFilterCount`, setters, and `clearAllFilters`.
- **Removes the client-side `filteredCustomers` memo** (filtering moves to the server). Sorting also moves to the server (`order by created_at desc`, matching Order Management).
- Adds a 300ms debounced `searchTerm` to feed the data hook (same UX as orders).

**3. `src/components/CustomerManagement.tsx`**
- Replace `useQuery` with `useCustomersData({ searchQuery, customerTypeFilter, entityTypeFilter, statusFilter })`.
- Pass `fetchNextPage`, `hasNextPage`, `isFetchingNextPage` down to `CustomerList`.
- `CustomerStats` currently counts the loaded array — switch it to display **totals from the server** via lightweight `head: true, count: 'exact'` queries (one per stat: total, active, residential, trade, account) so the headline numbers reflect every customer, not just the 50 currently loaded.

**4. `src/components/customer/CustomerList.tsx`**
- Add the same "Load More Customers" footer button used by `OrderList` (button calls `fetchNextPage`, disabled while `isFetchingNextPage`, hidden when `!hasNextPage`).
- Empty state unchanged.

**5. `src/components/customer/CustomerFilters.tsx`**
- No structural change; the existing `Showing X of Y` line becomes `Showing X of Y loaded (Z total)` where Z is the server total count, so it's clear more can be loaded.

### Technical notes

- All search/filter queries hit the server with `.range(from, to)` so the 1000-row cap is bypassed by paging — identical to how Order Management already accesses 10k+ orders.
- Search across joined company name uses the suburb pre-search pattern from `useOrderData.fetchMatchingCustomerIds` for parity.
- Customer dialog, edit, delete, view orders, and import flows are untouched — they already work off a single `customer` object, not the list.
- Query key: `['customers-paginated', debouncedSearch, customerType, entityType, status]` so cached pages invalidate cleanly when filters change.
- `handleDialogSuccess` and `handleImportSuccess` already call `queryClient.invalidateQueries({ queryKey: ['customers'] })`; update those keys to the new paginated key.

### Files modified

- `src/components/CustomerManagement.tsx`
- `src/components/customer/CustomerList.tsx`
- `src/components/customer/CustomerFilters.tsx`
- `src/components/customer/CustomerStats.tsx`
- `src/hooks/useCustomerFilters.ts`
- `src/hooks/useCustomerActions.ts` (update invalidation key)
- New: `src/hooks/useCustomersData.ts`

### Result

- Every customer in the database is reachable through search/filter, no matter how many exist.
- Initial load is faster (50 rows vs up to 1000).
- "Load More Customers" pages through the rest exactly like Order Management.
- Account customers from years ago can be found by name, account number, email, or phone, then have a new order placed.
- Stats cards reflect true totals across the entire customers table.

