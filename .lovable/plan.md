## Two-Level Payment System (SHGS)

Split the current single `payment_method` field into two dimensions: **payment type** (commercial terms) and **payment method** (money transfer channel), with the method dropdown filtered by the selected type.

### 1. Shared config — `src/utils/paymentTypes.ts`
Single source of truth used by DB validation logic, forms, filters, badges, and future MYOB push.

```ts
PAYMENT_TYPES = ['30_day_account','7_day_account','trade','card_on_file','residential','cod']
PAYMENT_METHODS = ['pay_credit_card','pay_direct_debit','account_cash',
                   'credit_card','direct_debit','cash']
PAYMENT_TYPE_METHODS: Record<type, method[]>   // matches spec exactly
methodHasSurcharge(m)                          // credit-card variants
labelForType / labelForMethod                  // display helpers
```

### 2. Database migration
- Add `orders.payment_type text` (nullable to keep history intact).
- Backfill from existing `payment_method` values:
  - `invoice`, `7_day_invoice` → `7_day_account`
  - `account`, `account_card`, `account_cash` → `30_day_account`
  - `card_on_file` → `card_on_file`
  - `cod` → `cod`
  - `card`, `in_yard_card` → `residential`
  - fallback → `residential`
- Normalize legacy `payment_method` values to the new canonical IDs (`credit_card`, `cash`, `direct_debit`, `pay_credit_card`, `pay_direct_debit`, `account_cash`).
- BEFORE INSERT/UPDATE trigger validating `(payment_type, payment_method)` against the allowed-methods map; skips validation when `payment_type` is null so old rows still update.
- `CREATE INDEX orders_payment_type_idx ON orders(payment_type)` for the new filter.
- No changes to `customer_type` — payment type stays on the order.

### 3. Order create flow
- `useOrderFormState`: add `paymentType` state, persist in the sessionStorage draft alongside `paymentMethod`.
- `MultiStepOrderForm`: thread `paymentType`/`setPaymentType` into step 6 and into both `createSingleOrder` / `createSplitOrder` params.
- `orderCreationService` (`CreateSingleOrderParams`, `CreateSplitOrderParams`, single + split + master inserts): write `payment_type` alongside `payment_method`.
- `backorderService`: copy `payment_type` from the source order onto the backorder.
- `PaymentMethodStep` redesign:
  - Visual grid of 6 payment-type cards with short descriptions.
  - Dependent method `<Select>` populated from `getAllowedMethods(paymentType)`; auto-repairs the method when the type changes.
  - Surcharge badge on card options using `payment_settings.service_charge_rate`.
  - Card-on-file default-card hint retained.
  - Continue disabled until both are chosen and valid together.

### 4. Order edit flow
- `OrderEditFormTypes.Order`, `useOrderFormData.OrderFormData`, `useOrderData.Order` / `OrderFilters`: add `payment_type`.
- `useOrderData` query: select `payment_type` and add server-side `.eq('payment_type', …)` filter.
- `OrderEditFormSubmission`: include `payment_type` in the update payload.
- `OrderPricingForm`: replace the single payment select with dependent Type + Method selects; changing type resets the method to the first valid option.

### 5. Display + filtering
- `OrderCard`: render a Payment Type `Badge` next to the status badge using `labelForType`.
- `OrderSearchFilters`: add a **Payment Type** dropdown (All + 6 types).
- `OrderManagementProvider`: `paymentTypeFilter` state, feed to `useOrderData`, expose via context.
- `OrderManagement`: thread the filter to `OrderSearchFilters` / `OrderSearchControls`.

### 6. Surcharge alignment
`paymentCalculations.getPaymentMethodSurcharge` updated to the new method IDs (`credit_card`, `pay_credit_card`) so totals stay correct across create, edit, and receipts.

### 7. MYOB alignment (schema only, no push changes now)
`payment_type` becomes the clean signal for the future MYOB push: `30_day_account` → NET 30 invoice, `7_day_account` → NET 7 invoice, everything else → cash sale. No code change to `myob-push-invoice` in this scope.

### Out of scope
- Daily breakdown / reporting on the new types (next step).
- Changes to `customer_type` or storefront checkout.
- Editing the auto-generated `src/integrations/supabase/types.ts` (regenerates after migration; inserts/updates use light `as any` casts until then).

### Deliverables checklist
- [ ] Migration: add column, backfill, normalize methods, validation trigger, index.
- [ ] `src/utils/paymentTypes.ts` shared config.
- [ ] Create flow: state, service params, step UI.
- [ ] Edit flow: types, query, submission, form UI.
- [ ] OrderCard badge + Order Management filter.
- [ ] Surcharge helper updated to new method IDs.
