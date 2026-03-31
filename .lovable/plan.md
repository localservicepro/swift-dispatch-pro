

## Infinite Scroll for Orders

### Problem
Currently fetching up to 5,000 orders in a single query, which is slow and will eventually hit limits. The user wants load-more / infinite loading.

### Approach
Use `useInfiniteQuery` from TanStack Query with cursor-based pagination (using `created_at` + `id`). Render a "Load More" button at the bottom of the order list that fetches the next page. Client-side filtering (search, status, payment) continues to work across all loaded pages.

**Page size**: 50 orders per page.

### Changes

**1. `src/components/order/hooks/useOrderData.ts`**
- Replace `useQuery` with `useInfiniteQuery`
- Fetch 50 orders per page using `.range(from, to)` based on `pageParam`
- Export `fetchNextPage`, `hasNextPage`, `isFetchingNextPage` alongside existing exports
- Flatten all pages into a single `orders` array so `useFilteredOrders` works unchanged
- Keep the `.limit(5000)` removed, use pagination instead

**2. `src/components/order/OrderManagementProvider.tsx`**
- Pass through `fetchNextPage`, `hasNextPage`, `isFetchingNextPage` from `useOrderData` into context

**3. `src/components/order/OrderList.tsx`**
- Accept `fetchNextPage`, `hasNextPage`, `isFetchingNextPage` props
- Add a "Load More" button at the bottom when `hasNextPage` is true
- Show a spinner on the button while fetching

**4. `src/components/OrderManagement.tsx`**
- Pass the new pagination props from context to `OrderList`

### Technical detail
- Pagination is offset-based using `.range()` since orders are sorted by `created_at desc`
- `useInfiniteQuery` `getNextPageParam` returns the next offset if the current page returned a full page of results (50), otherwise `undefined`
- All loaded pages are flattened before passing to `useFilteredOrders`, so search/filter works across everything loaded so far
- The total count display will show "X of Y loaded" to indicate more may be available

