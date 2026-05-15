## Goal
Surface the actual order numbers behind each customer row in the Product Sales report, with a click-to-open order dialog.

## UX
- Each customer row in `ProductSalesByCustomer` becomes expandable (chevron in the first cell). Default collapsed.
- Expanding the row reveals a nested table of that customer's matching orders within the report's filters:
  - Order Number (clickable, primary color)
  - Date
  - Products purchased (selected products only) with quantities
  - Order subtotal (sum of selected line items)
- Clicking an order number opens the existing `OrderEditDialog` over the report (matches the current order opening flow used elsewhere).
- CSV export gets an extra "Orders" column listing the matching order numbers per customer (comma-separated). Aggregated rows stay otherwise unchanged.

## Data layer
Update the `get_product_sales_by_customer` Postgres function to additionally return per-customer/per-product order detail. Two options; will use approach A:

- **A (chosen):** Add a sibling RPC `get_product_orders_by_customer` returning one row per (customer, order, product) with: `customer_id, order_id, order_number, order_date, product_id, product_name, quantity, line_total`. The report calls this once and aggregates client-side for both the existing customer view and the new expanded list. This avoids JSON columns and keeps the original aggregate function unchanged for compatibility.
- (B rejected: embedding a JSON `orders` array in the existing function — harder to type and breaks current consumers.)

The new RPC respects the same filters: `p_product_ids`, `p_start`, `p_end`, `p_customer_type`. Security definer + search_path = public.

## Frontend changes
- `useProductSalesReport.ts`: switch to the new RPC; build `CustomerAggregate` from the detailed rows, and attach an `orders: { id, order_number, date, items: {product_id, qty, amount}[], total }[]` array per customer.
- `ProductSalesByCustomer.tsx`:
  - Add expand state per row, chevron button in first cell.
  - Render nested orders table when expanded.
  - Order number is a button styled as a link; on click sets `selectedOrderId`.
  - Fetch the full order via `supabase.from('orders').select('*').eq('id', id).single()` on demand and render `<OrderEditDialog order={...} onClose={...} onOrderUpdated={refetch} />`.
  - Add Orders column to CSV export.

## Files
- `supabase/migrations/<new>.sql` — create `get_product_orders_by_customer` RPC.
- `src/hooks/useProductSalesReport.ts` — switch to new RPC, attach `orders` per customer.
- `src/components/reports/ProductSalesByCustomer.tsx` — expand UI, order dialog, CSV update.
- `src/components/reports/OrderQuickViewLoader.tsx` (new, small) — fetches the full order row by id and renders `OrderEditDialog`.

## Out of scope
- No changes to the Reports page chrome, filters, or product picker.
- No changes to `OrderEditDialog` itself.
