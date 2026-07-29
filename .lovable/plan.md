## Goal
Standardise every user-visible date in the app on Australian format: **DD/MM/YYYY** for numeric dates, and day-before-month for textual dates (e.g. `14 Jul 2026`). Reports, dialogs, receipts, emails, portal, dashboards — everywhere.

## What's wrong today
A codebase sweep found ~25 places still using `toLocaleDateString()` with no locale (browser default, often US), `'en-US'` explicitly, or `MMM d, yyyy` (month-before-day):

- Reports & quick view: currently OK (`dd/MM/yyyy`), but the CSV/statement paths and OrderQuickView row need verification.
- Payments: `PaymentManagement.tsx`, `PaymentDetailsCard.tsx`, `payment/SplitOrderGroupCard.tsx`.
- Opportunity: `DeletedOrdersList.tsx` (3 spots).
- Customers: `CustomerCreditSelector.tsx`, `CustomerOrderCreate.tsx`, `CustomerPortalDashboard.tsx`.
- Orders: `OrderCard.tsx`, `returns/OrderReturnsSection.tsx`, `CompactSplitConfig.tsx`, `SplitSummaryCard.tsx`, `ProductSelectionStep.tsx`.
- Team/Trucks: `ViewDeliveriesDialog`, `ViewActivityDialog`, `DriverTeamSection`, `AdminTeamSection`, `TruckStatusCard`.
- Settings/Specials/Products: `ActivityLog.tsx` (`MMM dd, yyyy HH:mm:ss`), `SpecialList.tsx`, `product/ProductList.tsx`.
- Profile: `MyProfile.tsx` (`en-US`).
- Edge functions: `google-sheets-sync`, `verify-invoice-payment`, portal PIN email templates (`en-US`).

## Plan

1. **Add shared helpers in `src/utils/dateTimeUtils.ts`**
   - `formatAuDate(date)` → `DD/MM/YYYY`
   - `formatAuDateLong(date)` → `14 Jul 2026`
   - `formatAuDateTime(date)` → `DD/MM/YYYY, h:mm AM/PM`
   - Update existing `formatCreatedTime` / `getCurrentTime` to use `en-AU` (behaviour identical, locale corrected).

2. **Replace all frontend numeric date renders** with `formatAuDate` (or `formatAuDateTime` where a time is shown). Files listed above. Any `format(..., 'MMM d, yyyy')` becomes `format(..., 'd MMM yyyy')` for consistent AU ordering; short forms like `MMM dd` become `dd MMM`.

3. **CSV / exports** — audit `ProductSalesByCustomer` CSV, `useAccountStatementExport`, and `google-sheets-sync` edge function. Any date column written to a spreadsheet gets `DD/MM/YYYY`. Sheet payload date currently uses `toLocaleDateString()` with no locale — force `en-AU`.

4. **Edge function email templates** — `portal-pin-created.tsx` and `portal-pin-regenerated.tsx` currently render expiry dates with `en-US`; switch to `en-AU` with day/month/year ordering.

5. **Receipt/thermal receipt** — already `en-AU`, no change.

6. **Verify** — after edits, grep for remaining `en-US`, bare `toLocaleDateString()`, and `MMM d, yyyy` to confirm none remain in user-visible surfaces.

## Notes
- No DB or schema changes. Storage stays ISO; only display changes.
- Time format stays 12-hour with AM/PM (existing convention).
- Nothing in business logic or calculations changes.
