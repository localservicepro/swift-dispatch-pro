## Product Sales by Customer report

A new admin report that answers "who bought product X (and how much) between these dates?" — like the GP Cement query above.

### Where it lives
- New page/tab under Order Management: **Reports → Product Sales by Customer**
  - Add a top-level "Reports" section in `AdminSidebar.tsx`, or a "Reports" sub-tab inside the existing Orders page (TBD; default: new sidebar item `/reports/product-sales`).

### Filters (top of the page)
1. **Date range** — preset chips + custom range
   - Presets: Today, Last 7 days, Last 30 days, This month, Last month, Custom
   - Custom uses two shadcn date-pickers (DD/MM/YYYY display)
   - Default selection: **Last 30 days**
2. **Products** — multi-select searchable combobox
   - Pulls from `products` (active only), shows name + SKU
   - Selected items shown as removable chips
3. **Customer type** (optional secondary filter) — All / Account / Trade / Residential
4. **Apply / Reset** buttons

### Results table
Columns:
- Customer (links to customer detail)
- Customer type badge (existing color tokens)
- Total quantity (summed across selected products)
- Per-product quantity breakdown (one column per selected product, or expandable row)
- Order count
- First order date / Last order date (DD/MM/YYYY)
- Total spend on those line items

Sortable headers; default sort: total quantity desc.

Footer row with grand totals (total bags, total orders, total spend).

**Export CSV** button (top-right) — exports current filtered result.

### How the data is fetched
Add a Postgres RPC `get_product_sales_by_customer(p_product_ids uuid[], p_start timestamptz, p_end timestamptz, p_customer_type text default null)`:
- `SECURITY DEFINER`, `SET search_path TO 'public'`, admin-only check via `is_current_user_admin()`
- Iterates `orders` (excluding `deleted_at`) in date range, unnests `products` jsonb, filters by `(item->>'id')::uuid = ANY(p_product_ids)`
- Returns rows: `customer_id, customer_name, customer_type, product_id, product_name, total_quantity, total_amount, order_count, first_order, last_order`
- Frontend pivots per-product columns from these rows

### Files to add
- `src/pages/Reports.tsx` (route shell) + route in `App.tsx` (`/reports/product-sales`)
- `src/components/reports/ProductSalesByCustomer.tsx`
- `src/components/reports/ProductMultiSelect.tsx`
- `src/components/reports/DateRangePresetPicker.tsx`
- `src/hooks/useProductSalesReport.ts`
- Sidebar entry in `AdminSidebar.tsx`
- Migration: new RPC `get_product_sales_by_customer`

### Out of scope
- Editing the existing Order Management filters (request was for a customer-aggregated report, not a per-order product filter)
- Charts/graphs (table only for now)

```text
[Date: Last 30d ▾] [Products: 20kg GP Cement × +Add ▾] [Type: All ▾]  [Reset] [Apply]   [⬇ Export CSV]

┌──────────────────┬───────┬──────┬───────────┬──────────┬─────────────┬──────────┐
│ Customer         │ Type  │ Bags │ 20kg GP   │ Orders   │ Last order  │ Spend    │
├──────────────────┼───────┼──────┼───────────┼──────────┼─────────────┼──────────┤
│ Dennis Yan       │ Trade │  95  │   95      │   4      │ 14/05/2026  │ $...     │
│ Michael Yuan     │ Trade │  70  │   70      │   3      │ 11/05/2026  │ $...     │
│ ...                                                                              │
└──────────────────┴───────┴──────┴───────────┴──────────┴─────────────┴──────────┘
                                Totals: 850 bags · 47 orders · $...
```
