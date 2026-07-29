## Diagnosis

Not caused by the new payment settings. Both orders have `payment_type = '30_day_account'` and `status = 'delivered'`.

The discrepancy is a soft-delete filter mismatch:

- `ORD-707578` ($3907.50, May 25) — `deleted_at = 2026-05-25 04:38:29` (soft-deleted)
- `ORD-284388` ($502.00, May 22) — `deleted_at = NULL`

The **Export Statement** flow (both preview hook and edge function) correctly excludes soft-deleted orders with `.is('deleted_at', null)`, so it returns 1 order = $502. Correct behavior.

The **Customer Orders History** view (screenshot #1: "Total Orders: 2", $4409.50) is loading the deleted order as if it were live. That view is missing the `deleted_at IS NULL` filter, which is the actual bug.

## Plan

1. Locate the customer orders history query — likely `src/hooks/useCustomerAnalytics.ts` and/or the component under `src/components/customer/` that renders "Order History" and the Total Orders / Total Revenue / Average Order cards.
2. Add `.is('deleted_at', null)` to that orders query so soft-deleted orders are excluded from:
   - Order History list
   - Total Orders count
   - Total Revenue / Average Order metrics
3. Verify the two views now match: history shows 1 order, statement preview shows 1 order.

## Technical notes

- No schema changes, no edge function changes, no payment-type logic changes.
- Single frontend fix scoped to the customer orders view query.
- Answer to the user's question: the new payment settings are not the cause here — the exported statement is right, the on-screen order history is wrong because it includes a soft-deleted order.
