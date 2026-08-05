# State Check + Batch 0 Plan (Statements & Payment Type)

## Part 1 — State check (verified against code and live database)

**What the 29 Jul revert rolled back: code only, not the database.**
- `payment_type` no longer appears anywhere in `src/` or `supabase/functions/` (only in the generated Supabase types file). The UI and order-creation service that wrote it are gone.
- The column still exists on `orders` and still holds the backfilled data. The 24 Jul migration was not reversed.

**Is the backfill still applied? Yes.** Current `orders.payment_type` distribution:

| payment_type | orders | first | last |
|---|---|---|---|
| residential | 6,326 | 2025-08-21 | 2026-07-29 |
| 30_day_account | 2,602 | 2025-08-21 | 2026-07-30 |
| (null) | 340 | 2026-07-24 | 2026-08-05 |
| cod | 296 | 2026-01-19 | 2026-07-29 |
| trade | 16 | 2026-07-24 | 2026-07-30 |
| 7_day_account | 12 | 2026-02-02 | 2026-07-28 |
| card_on_file | 6 | 2026-02-18 | 2026-07-30 |

Since the revert, every new order writes `payment_type = null` (340 rows and growing) — so the field is now both wrong historically and unpopulated going forward.

**Important correction on B0-2: activity_logs does NOT contain the original payment_type.**
Across all 43,898 rows, `old_values` and `new_values` are null on every single record — including all 5,753 `order_edit` entries. Only `target_details` is populated, and it carries a fixed key set (`oldStatus`, `newStatus`, `oldTotal`, `newTotal`, `productsChanged`, `totalAmountChanged`). There is no payment field anywhere in it. A repair migration sourced from activity_logs is not possible; the plan below uses a different, verifiable source.

**Current owners of the three surfaces:**

| Surface | File(s) |
|---|---|
| Payment type/method at order creation | `src/components/order/PaymentMethodStep.tsx` (7-option picker, mixes billing terms with settlement terms), written by `src/components/order/services/orderCreationService.ts` (3 write paths: single, split, backorder) |
| Payment method at order edit | `src/components/order/hooks/useOrderFormData.ts` (line 63 default), `src/components/order/OrderPricingForm.tsx` (the `<select>`), saved via `src/components/order/OrderEditFormSubmission.ts` |
| Monthly customer statement | `supabase/functions/generate-account-statement/index.ts` (query + HTML), `src/hooks/useAccountStatementExport.ts` (preview counts), `src/components/customer/AccountStatementExportDialog.tsx` (UI) |
| Yard Sale path | `src/components/YardSaleManagement.tsx` — has no notion of payment type; it is simply `orders` filtered by `delivery_method = 'pickup'` |

---

## Part 2 — Batch 0 plan

### The two-level model (defined here, once, so B5 can reuse it)

Two independent fields, never conflated:

- **`payment_type` — who pays and how they are billed.** Account-level. Values: `30_day_account`, `7_day_account`, `prepaid`. Derived from the customer, not chosen per transaction. Only `*_account` types are statement-eligible.
- **`payment_method` — how this one transaction settled.** Values: `cash`, `card`, `cod`, `card_on_file`, `direct_debit`, `invoice`, `on_account`.

Rule: statement eligibility is decided by `payment_type`, never by `payment_method`. "Account - Cash" becomes `payment_type = 30_day_account` + `payment_method = cash`.

`payment_type` becomes derived-with-override: it defaults from `customers.customer_type` at write time and is only overridden explicitly. That removes the class of bug where an order is "on an account" but not flagged.

### B0-1 — Statement query must not depend on a flag being set

Root cause to fix: statement inclusion must key off the customer's account standing, with the order-level `payment_type` as an override only when it is present. Change `generate-account-statement/index.ts` so an order is included when the customer is an account customer **and** the order's `payment_type` is not an explicit non-account value — i.e. null and legacy-wrong values still get included rather than silently dropped. Mirror the exact same predicate in `useAccountStatementExport.ts` so the preview count and the printed statement can never disagree.

The predicate lives in one shared helper used by both the edge function query and the preview, so B5 and later statement work inherit it.

### B0-2 — Reversible data repair (activity_logs is empty, so use a defensible source)

Since the original values are unrecoverable from logs, repair from the two signals that are intact:

1. `customers.customer_type = 'account'` — the account relationship itself, untouched by the 24 Jul migration.
2. `orders.payment_method IN ('account_cash','account_card','pay_credit_card','invoice','direct_debit')` — the settlement value recorded at order time, which the backfill did not overwrite.

Scope confirmed by query: for delivered orders since 1 Jun alone there are ~89 account-customer orders stamped `residential`, ~10 more stamped `residential` with `payment_method = cash`, and ~66 account orders sitting at null. The full historical set will be larger.

Migration structure:
- Create `payment_type_repair_backup` (order_id, old_payment_type, new_payment_type, reason, repaired_at) and insert every row **before** updating. This is the rollback path — a single `UPDATE ... FROM backup` restores the prior state exactly.
- Update only rows where the customer is an account customer and `payment_type` is null or `residential`. Do not touch `cod`, `trade`, `7_day_account`, or `card_on_file` rows; do not touch orders whose customer is not an account customer.
- Record which of the two signals justified each row in `reason`, so the repair is auditable and partially reversible per-reason.
- Set a column default / trigger so newly created orders stop writing null.

I will show you the affected-row counts from a dry-run SELECT before the migration is submitted for approval.

### B0-3 — Yard Sale orders on statements

`YardSaleManagement.tsx` currently only reads `delivery_method = 'pickup'` and never writes payment fields, so a yard sale for an account customer lands with no account flag and falls out of the statement. Fix at the write layer rather than in the statement:
- Route yard sale creation through the same shared payment-type resolver used by standard orders (customer account standing → `payment_type`), so the transaction is statement-eligible by construction.
- The statement query already handles pickup dates (`pickup_date` vs `delivery_date`), so no statement-side special-casing for yard sale is needed once the type is written correctly.
- Expose the resolver as a standalone function (not inlined into the Yard Sale component) so the B5 fast-track path can call it without duplicating logic.

### B0-4 — Payment method resets to "Cash" on reopen

Two causes, both confirmed:
1. `useOrderFormData.ts` line 63: `order.payment_method || 'cash'` — a null becomes Cash silently.
2. `OrderPricingForm.tsx`'s `<select>` has no option for values that exist in the data (`credit_card`, `pay_credit_card`, `direct_debit`), so the control renders unmatched and the first save writes `cash` over the real value.

Fix: preserve the stored value verbatim (no `|| 'cash'` fallback — show an empty/unset state instead), align the option list to the canonical `payment_method` vocabulary above, and render any unrecognised stored value as a disabled "current value" option so reopening an order can never overwrite it.

### Verification query (run after the migration)

A single query you can run to prove the regression is closed. It reports, per month: account-customer delivered orders, how many are statement-eligible under the new predicate, and how many are still excluded — the last column should be 0.

```sql
select date_trunc('month', coalesce(o.delivery_date, o.pickup_date))::date as month,
       count(*) as account_orders,
       count(*) filter (where o.payment_type in ('30_day_account','7_day_account')) as on_statement,
       count(*) filter (where o.payment_type is null or o.payment_type = 'residential') as still_missing
from orders o
join customers c on c.id = o.customer_id
where c.customer_type = 'account' and o.status = 'delivered' and o.deleted_at is null
group by 1 order by 1 desc limit 12;
```

Plus a spot check against a named client statement for the current month, comparing order count and balance before/after.

### Explicitly out of scope for Batch 0

- Order total recalculation and any `useEffect` in the pricing path — B1.
- Delivery address derivation, Places restriction, "Same Address for All" — B2.
- Split parent/child propagation — B3.
- Yard Sale one-tap fast-track UX — B5 (this batch only makes the data path reusable for it).

### Files to be changed

- `supabase/functions/generate-account-statement/index.ts` — statement predicate
- `src/hooks/useAccountStatementExport.ts` — matching preview predicate
- new shared payment-type resolver + statement-eligibility helper (frontend + a mirrored SQL condition)
- `src/components/order/services/orderCreationService.ts` — write `payment_type` on all three creation paths
- `src/components/YardSaleManagement.tsx` — use the resolver on yard sale creation
- `src/components/order/hooks/useOrderFormData.ts`, `src/components/order/OrderPricingForm.tsx` — B0-4
- one migration: backup table + scoped repair + default
