## Goal
Refresh `DashboardOverview` with a modern Slate & Steel look (matching the Review redesign), more accurate data scoped to a selectable window, and richer operational widgets.

## Data accuracy fixes
- All headline KPIs scope to the selected window (Today / 7d / 30d) using `created_at`.
- Exclude `cancelled` orders from totals (count, revenue, AOV).
- Revenue uses `total_amount` of orders within window, excluding cancelled. Add a separate "Delivered revenue" sub-stat that filters `status = 'delivered'`.
- Replace lifetime "Total Orders" with windowed Orders count; show delta % vs previous equivalent window.
- Use Australian DD/MM/YYYY for any displayed dates.

## New layout (Slate & Steel)
Single page, responsive grid, sticky header.

```text
┌─ Header: title • Today/7d/30d toggle • Refresh ─────────────┐
├─ KPI row (6 cards, dense, slate borders, neutral surfaces): │
│   Orders | Revenue | AOV | Delivered | In Transit | Unpaid   │
│   (each with delta % vs prior window)                        │
├─ Today's Operations strip (3 stat tiles):                    │
│   Scheduled today | Delivered today | Overdue (past delivery │
│   date & not delivered/cancelled)                            │
├─ 2-col main grid:                                            │
│   Left: Revenue trend (area) + Status distribution (donut)   │
│   Right: Customer-type mix (Account/Trade/Residential)       │
│          - count, revenue, AOV per type                      │
├─ 2-col secondary grid:                                       │
│   Top customers (30d) | Top products (30d) - rank lists      │
├─ 2-col tertiary grid:                                        │
│   Recent orders | Stock alerts (unchanged data, new styling) │
└─ Fleet/Driver utilization card:                              │
    Active drivers today, trucks assigned vs idle, on-time %   │
```

## Widgets
- **Today's deliveries**: query orders where `delivery_date = today` for scheduled; delivered today via `status='delivered'` + `updated_at` today (or `delivery_status_updates` to 'delivered' today). Overdue = `delivery_date < today AND status NOT IN ('delivered','cancelled')`.
- **By customer type**: join `customers.customer_type`, group orders in window into account/business/residential (aliased Trade for business). Show count, revenue, AOV.
- **Top customers (30d)**: aggregate `orders.customer_id` by sum(total_amount), top 5, with display name logic (company → business → personal).
- **Top products (30d)**: aggregate from `order_items` (qty, revenue), join `products.name`, top 5.
- **Fleet utilization**: count distinct `driver_id` with orders today; `trucks` table — total vs assigned today via `truck_id` on today's orders.

## Design tokens
- Container: `bg-slate-50` page, cards `bg-white border-slate-200` with subtle `shadow-sm`, hover lift.
- Accent: slate-800 headings (Space Grotesk), DM Sans body, single steel-blue accent `text-slate-700` numerals, semantic badges (emerald delivered, amber preparing, sky en_route, rose cancelled, red overdue/unpaid).
- KPI card: small label + large tabular number + delta chip (▲ green / ▼ red / – muted).
- Remove rainbow gradient cards. Use one consistent surface; color encoded only via small status dots/chips.
- Charts use slate palette (slate-700 line, slate-300 grid), single accent for primary series.

## Files
- **Edit** `src/components/DashboardOverview.tsx`: rewrite UI + queries.
- **New** `src/components/dashboard/useDashboardMetrics.ts`: encapsulate windowed queries (`window: 'today' | '7d' | '30d'`), returns KPIs + deltas.
- **New** `src/components/dashboard/KpiCard.tsx`, `DashboardSection.tsx`, `RangeToggle.tsx`, `TypeMixCard.tsx`, `TopCustomersCard.tsx`, `TopProductsCard.tsx`, `TodayOpsCard.tsx`, `FleetUtilizationCard.tsx`.
- Reuse existing recharts; recolor only.
- No DB migrations — read-only against existing tables (`orders`, `order_items`, `customers`, `products`, `invoices`, `trucks`, `profiles`, `delivery_status_updates`).

## Out of scope
- No changes to order/payment business logic, edge functions, or schema.
- No new permissions/RLS changes (admin-only page already gated).
- Real-time subscriptions kept as-is.

## Validation
- Verify each KPI matches a manual SQL count for a sample window.
- Responsive at 390 / 768 / 1234 px.
- Dashboard loads under 1s with parallel queries; subscriptions still refresh on order/product/invoice changes.
