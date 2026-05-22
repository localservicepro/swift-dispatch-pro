# Add Phone Numbers to Product Sales Report

Show the phone number tied to each customer's orders in the Product Sales by Customer report (table + CSV export).

## Phone source

For each order row, use `orders.customer_phone` (the number captured on that order). Fall back to `customers.phone` if the order has none. When a customer used multiple distinct phones across their orders, show all of them (comma-separated), so the user sees what was "used or registered from that order".

## Changes

### 1. DB — extend RPC `get_product_orders_by_customer`
Add `customer_phone text` to the returned columns:
```sql
COALESCE(NULLIF(o.customer_phone, ''), c.phone) AS customer_phone
```
Everything else unchanged. Migration via `supabase--migration`.

### 2. `src/hooks/useProductSalesReport.ts`
- Add `customer_phone: string | null` to `DetailRow`.
- Add `phones: string[]` to `CustomerAggregate`.
- While aggregating, collect unique non-empty phones per customer into a Set, then materialize as sorted array.

### 3. `src/components/reports/ProductSalesByCustomer.tsx`
- Add a "Phone" column header right after "Customer" (before "Type").
- Render `r.phones.join(", ")` or `—` if empty. Use `tabular-nums whitespace-nowrap`.
- Update `colSpan` (currently `8 + productsMeta.length` → `9 + productsMeta.length`).
- Update `tfoot` "Totals" colSpan from 2 → 3 so totals still align.
- Add "Phone" to CSV `headers` and emit `"${r.phones.join("; ")}"` per row.

## Out of scope
- No changes to order creation flow, customer table, or other reports.
- No per-order phone display inside the expanded "Matching orders" sub-table (phones are aggregated at the customer level). Can add later if needed.
