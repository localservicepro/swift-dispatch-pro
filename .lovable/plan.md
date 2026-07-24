## Two-level Payment Type + Method (SHGS)

Split the single `payment_method` field into a payment **type** (customer/order-level terms) and a dependent payment **method** (how funds arrive). No report work yet — just schema, order flow, and display.

### 1. Payment type → method mapping (typed constant)

New file `src/utils/paymentTypes.ts` — single source of truth used by UI, validation, and edge functions:

```text
30_day_account   → pay_credit_card, pay_direct_debit, account_cash
7_day_account    → credit_card, direct_debit, cash
trade            → credit_card, direct_debit, cash
card_on_file     → credit_card, direct_debit, cash
residential      → credit_card, direct_debit, cash
cod              → cash, direct_debit, credit_card   (first = default)
```

Exports: `PAYMENT_TYPES`, `PAYMENT_METHODS_BY_TYPE`, `PAYMENT_TYPE_LABELS`, `PAYMENT_METHOD_LABELS`, helpers `getMethodsForType(type)`, `getDefaultMethodForType(type)`, `isValidTypeMethod(type, method)`. Kept as a TS constant (not a DB table) so both frontend and edge functions import it and MYOB mapping can reference it directly.

### 2. Database migration

- Add `orders.payment_type text` (nullable initially for backfill).
- Add DB-level validation trigger `validate_payment_type_method` that (a) checks `payment_type` is in the enum-like allowed set and (b) checks `(payment_type, payment_method)` combo is allowed. Trigger, not CHECK, per project convention.
- Add index on `payment_type` for the new filter.
- **Backfill existing orders** (data migration in same file) mapping legacy `payment_method` → new `(payment_type, payment_method)`:

  ```text
  legacy payment_method  → payment_type       payment_method
  cash                   → residential        cash
  cod                    → cod                cash
  card_on_file           → card_on_file       credit_card
  invoice                → 30_day_account     pay_direct_debit
  7_day_invoice          → 7_day_account      direct_debit
  in_yard_cash           → residential        cash
  in_yard_card           → residential        credit_card
  account_cash           → 30_day_account     account_cash
  account_card           → 30_day_account     pay_credit_card
  ```

  Legacy string values are also written back into `payment_method` where they map to a new canonical key (e.g. `invoice` → `pay_direct_debit`) so old order history stays readable and the surcharge logic keeps working. Legacy value `7_day_invoice` is preserved by mapping to the new `7_day_account` type with `direct_debit` method.

- Optional (later): default `orders.payment_type` from `customers.customer_type` at insert time via trigger — out of scope for this step to keep behaviour explicit in the form.

### 3. Order create / edit UI

- `useOrderFormData.ts`: add `payment_type` field; when it changes, auto-set `payment_method` to `getDefaultMethodForType(newType)` (avoids invalid combos). When `payment_method` alone changes, keep as-is.
- `OrderPricingForm.tsx`: replace the single Payment Method `<select>` with two shadcn `Select`s stacked — **Payment Type** first, **Payment Method** second (options filtered via `getMethodsForType(formData.payment_type)`). Method select is disabled until a type is chosen.
- Prefill on create: default `payment_type` from the selected customer's `customer_type` if it maps cleanly, else `residential`.
- Prefill on edit: use existing `order.payment_type`; if missing (legacy row that somehow slipped backfill), infer from `payment_method` using the reverse map above.
- Surcharge logic in `paymentCalculations.ts`: extend `getPaymentMethodSurcharge` to include the new keys (`pay_credit_card`, `credit_card`, `pay_direct_debit`, `direct_debit`, `account_cash`, `account_card`) — surcharge applies to card-based methods and account-terms methods, matching current behaviour.
- `storefront-create-order` edge function: accept optional `payment_type`; validate `(type, method)` against the shared constant; default type to `residential` when absent.

### 4. Display + filter

- **OrderCard / OpportunityCardInfo / OrderDetailsCard**: add a small `payment_type` badge next to the existing payment method label (e.g. `30 Day Account · Direct Debit`). Reuse `customerTypeColors` palette so Account/Trade/Residential remain visually consistent.
- **Order Management filters** (`OrderSearchFilters` + `useOrderManagement` filter state): add a new `paymentTypeFilter` dropdown ("All payment types" + one entry per `PAYMENT_TYPES`). Wire into the existing `hasActiveFilters` / `clearFilters` logic and into the Supabase query (`.eq('payment_type', ...)`).

### 5. MYOB compatibility

`payment_type` is the field MYOB push will branch on later:
- `30_day_account` → MYOB invoice, terms Net 30
- `7_day_account`  → MYOB invoice, terms Net 7
- others → sale/receipt as today

No MYOB code changes in this step — schema is just kept clean for that mapping.

### Out of scope (later steps)
- Daily payment breakdown report.
- Auto-defaulting `payment_type` from `customer_type` at DB level.
- Migrating `customers.customer_type` enum to align 1:1 with payment types.

### Files touched

```text
supabase/migrations/<new>.sql                      (schema + backfill + trigger)
src/utils/paymentTypes.ts                          (new — shared constant)
src/components/order/utils/paymentCalculations.ts  (surcharge keys)
src/components/order/hooks/useOrderFormData.ts     (payment_type field + cascade)
src/components/order/OrderPricingForm.tsx          (two dependent selects)
src/components/order/OrderEditFormTypes.ts         (type)
src/components/order/services/orderCreationService.ts (persist payment_type)
src/components/order/services/backorderService.ts  (copy payment_type to splits)
src/components/storefront/StorefrontOrderFlow.tsx  (optional type in payload)
supabase/functions/storefront-create-order/index.ts (accept + validate)
src/components/order/OrderSearchFilters.tsx        (payment type filter)
src/components/order/OrderManagementProvider.tsx   (filter state + query)
src/components/opportunity/OrderCard.tsx           (badge)
src/components/opportunity/OpportunityCardInfo.tsx (badge)
src/components/driver/OrderDetailsCard.tsx        (badge)
```
