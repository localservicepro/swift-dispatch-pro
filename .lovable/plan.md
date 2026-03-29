

## Fix Customer Name Display + Data Cleanup

### Problem
1. The shared `getCustomerDisplayName` function logic is correct but needs junk-value filtering
2. Multiple files construct customer display names independently, bypassing the shared function
3. 120 customers have junk `company_name` values (`**`, `..`, `*`, `.`, `-`) and 45 have junk `first_name` values
4. Many residential/trade customers are incorrectly set as `entity_type: business`

### Changes

#### 1. Update `getCustomerDisplayName` to filter junk values
**File: `src/components/order/services/orderFormattingService.ts`**

Add a helper to detect junk strings (only punctuation/symbols like `*`, `**`, `..`, `.`, `-`). Apply it when reading `first_name`, `last_name`, `company_name`, and `business_name` so junk values are treated as empty.

#### 2. Consolidate all independent name constructions to use the shared function
Update these files to use the shared `getCustomerDisplayName` instead of inline `company_name || business_name || ...` logic:

- `src/components/customer/CustomerOrders.tsx` (line 77)
- `src/components/customer/CustomerOrderCreate.tsx` (line 107)
- `src/components/customer/AccountStatementExportDialog.tsx` (line 42)
- `src/components/customer/BulkPinManagementDialog.tsx` (line 167)
- `src/components/customer/CustomerPortalDashboard.tsx` (line 86)
- `src/services/receiptService.ts` (line 246-258)

#### 3. Database cleanup via migration
Run a data-cleaning migration to:
- Set `company_name = NULL` where value is in (`*`, `**`, `..`, `...`, `.`, `-`) for residential/trade customers
- Set `business_name = NULL` where value is junk
- Set `first_name = NULL` where value is junk (`.`, `..`, `...`)
- Change `entity_type` from `business` to `individual` for residential/trade customers that have no real company name after cleanup

