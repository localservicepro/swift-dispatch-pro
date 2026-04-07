

## Fix: Order search doesn't find customers by company/business name

### Problem
Searching "nature" in Order Management returns 0 results, even though "Natures Best Landscapes" exists as a customer with orders. The server-side search only looks at columns on the `orders` table (`customer_name`, `order_number`, `customer_phone`, `purchase_order`, `contact_phone`, `contact_name`). Business/company names are stored on the `customers` table, which the `.or()` filter cannot reach.

### Solution
Use a Supabase database function (RPC) or a **text search column** approach. The simplest reliable fix is to add `delivery_address` and also do a **two-step search**:

1. When searching, first query the `customers` table for matching `company_name`, `business_name`, `first_name`, or `last_name`
2. Collect matching customer IDs
3. Expand the orders query to include `customer_id.in.(matched_ids)` in the `.or()` clause

### Plan

**File: `src/components/order/hooks/useOrderData.ts`**

- Add a preliminary query: when a search term exists, first search the `customers` table for matching `company_name.ilike`, `business_name.ilike`, `first_name.ilike`, `last_name.ilike`
- Collect the IDs of matching customers
- In the orders query `.or()`, append `customer_id.in.(id1,id2,...)` alongside the existing column filters
- If no customer matches are found, keep the existing order-column-only search (no change in behavior)

This approach requires no database migrations and works within existing RLS policies.

### Files to modify
- `src/components/order/hooks/useOrderData.ts` — add customer pre-search and expand `.or()` filter

