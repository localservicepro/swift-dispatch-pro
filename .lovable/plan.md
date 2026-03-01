

## Problem Analysis

There are **two distinct caching issues** causing the status not to reflect after marking an order as delivered in Order Management:

### 1. Opportunity Pipeline - Stale Cache
The `useOpportunityData` hook has aggressive caching settings:
- `staleTime: 2 minutes`
- `refetchOnWindowFocus: false`
- `refetchOnMount: false`

While it has a real-time subscription that should catch changes, the `orderStatusService.ts` (used by Order Management) does a direct `.update()` on the orders table. The real-time subscription in `useOpportunityData` should detect this, but the debounced invalidation (500ms delay) combined with `staleTime: 2min` means if the user switches tabs quickly, they may see stale data. More critically, `refetchOnMount: false` means navigating to the pipeline view won't refetch even if data is stale.

### 2. Customer Order History - No Cache Invalidation
The `customer-orders` query key is **never invalidated** anywhere in the codebase when an order status changes. The real-time subscription in `OrderManagementProvider` only invalidates `['orders']`, and the one in `useOpportunityData` only invalidates `['opportunity-orders']` and `['orders']`. Neither touches `['customer-orders']`.

### Fix

**File: `src/components/opportunity/useOpportunityData.ts`**
- Remove `refetchOnMount: false` so the pipeline always shows fresh data when navigated to
- Reduce `staleTime` to something shorter (e.g., 30 seconds)

**File: `src/components/order/OrderManagementProvider.tsx`**
- In the real-time subscription handler, also invalidate `['customer-orders']` when an order status changes

**File: `src/components/customer/CustomerOrders.tsx`**
- Add a real-time subscription to listen for order changes and refetch, OR simply set `refetchOnWindowFocus: true` (default) to ensure fresh data when the user navigates back

These changes ensure that:
- The opportunity pipeline always shows the latest status when viewed
- Customer order history reflects status updates made from Order Management

