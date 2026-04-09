

## Storefront Online Ordering with Account Number Validation

### Overview
Create a public storefront page at `/storefront` where customers enter their 5-digit account number. The system validates it against the `customers` table, and once verified, the customer can browse products, add to cart, and submit orders — all without requiring login.

### Architecture

```text
/storefront (public route, no auth required)
  ├── Step 1: Account Number Entry + Validation
  ├── Step 2: Product Browsing & Cart
  ├── Step 3: Delivery Method Selection
  ├── Step 4: Delivery/Pickup Details
  └── Step 5: Review & Submit Order
```

### Changes

**1. Database: RLS policy for anonymous product access**
- Add an RLS SELECT policy on `products` for `anon` role so unauthenticated users can browse active products
- Add an RLS SELECT policy on `product_categories` for `anon` role (already has one for active categories)
- Add an RLS INSERT policy on `orders` for `anon` role, scoped to storefront orders only (using a service-role edge function instead for security)

**2. Edge Function: `storefront-validate-account` (new)**
- Accepts `{ account_number: string }`
- Queries `customers` table by `account_number` where `is_active = true`
- Returns customer info (id, name, company, address, customer_type) or 404 error
- No auth required (public endpoint)

**3. Edge Function: `storefront-create-order` (new)**
- Accepts order payload with `account_number` for verification
- Re-validates the account number server-side
- Inserts the order using service role (bypasses RLS)
- Sets `placed_via = 'storefront'` to track origin
- Returns success with order number

**4. New page: `src/pages/Storefront.tsx`**
- Step 1: Clean account number input with validation button
  - Calls `storefront-validate-account` edge function
  - Shows customer name confirmation on success
  - Shows error on invalid account number
- Steps 2-5: Reuses `ProductSelectionStep` pattern but in a standalone public layout
  - Product browsing with categories and search
  - Delivery method, address, date/time
  - Order review and submit via `storefront-create-order`
- Branded header with business name from settings

**5. Route: Add `/storefront` as public route in `App.tsx`**
- Place alongside other public routes (portal-login, payment-success)
- No authentication wrapper

**6. New component: `src/components/storefront/StorefrontOrderFlow.tsx`**
- Multi-step order form similar to `CustomerOrderCreate` but standalone
- Account number validation step at the beginning
- Uses edge functions instead of direct Supabase calls for security

**7. New component: `src/components/storefront/AccountNumberStep.tsx`**
- Input for 5-digit account number
- Validate button with loading state
- Displays confirmed customer name/company after validation

### Files to create
- `supabase/functions/storefront-validate-account/index.ts`
- `supabase/functions/storefront-create-order/index.ts`
- `src/pages/Storefront.tsx`
- `src/components/storefront/AccountNumberStep.tsx`
- `src/components/storefront/StorefrontOrderFlow.tsx`
- `src/components/storefront/StorefrontProductBrowser.tsx`

### Files to modify
- `src/App.tsx` — add `/storefront` public route
- Database migration — add anon SELECT policy on `products` table for active products

### Security
- Account validation and order creation happen via edge functions using service role
- No direct database access from the storefront (anon users)
- Orders created with `placed_via = 'storefront'` for audit trail
- Account number re-validated server-side on order submission

