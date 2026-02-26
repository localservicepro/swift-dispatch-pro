

## Allow Drivers to Create Orders

### Overview
Currently, only admins/super_admins can create orders. This change will let drivers create orders from their Driver Dashboard, reusing the existing `MultiStepOrderForm` component.

### Changes Required

#### 1. Database: RLS Policy for Driver Order Insertion
Add an INSERT policy on the `orders` table allowing drivers to insert orders. Also need INSERT policies on `order_items` for drivers.

```sql
-- Allow drivers to insert orders
CREATE POLICY "Drivers can insert orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'driver'
  )
);

-- Allow drivers to insert order items
CREATE POLICY "Drivers can insert order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'driver'
  )
);
```

Also need SELECT access to `payment_settings` for drivers (the order creation service reads it):

```sql
CREATE POLICY "Drivers can view payment settings"
ON public.payment_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'driver'
  )
);
```

#### 2. Frontend: Add "Create Order" Button to Driver Dashboard
Add a "Create Order" button in the Driver Dashboard header area that opens a dialog containing the `MultiStepOrderForm`.

**File: `src/components/driver/DriverDashboard.tsx`**
- Import `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` and `MultiStepOrderForm`
- Add state for `isCreatingOrder` dialog
- Add a "+" or "Create Order" button next to the settings icon
- Render the dialog with `MultiStepOrderForm` inside
- On order created, refresh the orders list and close the dialog

#### 3. Order Creation Service: Handle Driver Context
The `orderCreationService.ts` sets `admin_id` from the current user. When a driver creates an order, we should still capture who created it. The `admin_id` field will store the driver's user ID (as the creator), which is already the current behavior since it just uses `user?.id`.

No changes needed here — the service already uses the authenticated user's ID.

#### 4. Driver Access to Required Tables
Drivers need SELECT access to tables used during order creation:
- `customers` — already has a general authenticated read policy? Let me check... No, customers only allows admin ALL and self-view. Drivers need to search customers.
- `products` / `product_categories` — drivers need to browse products.

We'll need SELECT policies for drivers on:
- `customers` (to search/select a customer)
- `product_categories` (already has authenticated SELECT)
- `products` (need to verify)

Let me check the products table access.

#### Summary of Changes

**New Migration:**
- Add INSERT policy on `orders` for drivers
- Add INSERT policy on `order_items` for drivers  
- Add SELECT policy on `payment_settings` for drivers
- Add SELECT policy on `customers` for drivers (to search customers during order creation)

**Modified Files:**
- `src/components/driver/DriverDashboard.tsx` — add "Create Order" button + dialog with `MultiStepOrderForm`

### Technical Details

The `MultiStepOrderForm` is self-contained and handles the full order creation flow (customer search → product selection → delivery/pickup → payment → review). It uses `orderCreationService.ts` which inserts directly via Supabase client. The only barriers are RLS policies preventing drivers from inserting into `orders`/`order_items` and reading `customers`/`payment_settings`.

The driver-created orders will appear in the admin pipeline as normal. The `admin_id` field will contain the driver's user ID, which serves as a record of who created the order.

### Files Summary
- **New migration**: RLS policies for driver order creation access
- **Modified**: `src/components/driver/DriverDashboard.tsx` — add create order UI

