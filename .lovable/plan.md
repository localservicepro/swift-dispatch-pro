

## Fix: Drivers Cannot See Customer Contacts

### Root Cause
The `customer_contacts` table has no RLS policy granting drivers SELECT access. Current policies only allow admins (ALL) and the customer themselves (SELECT/INSERT/UPDATE/DELETE on own contacts). When a driver creates an order and selects an account customer, the `ContactSelectionSection` queries `customer_contacts` but gets zero results due to RLS, triggering the "No contacts found for this company" message.

### Fix
Add a single SELECT RLS policy on `customer_contacts` for drivers.

**New Migration:**
```sql
CREATE POLICY "Drivers can view customer contacts"
ON public.customer_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'driver'
  )
);
```

### Files Changed
- New migration file — one SELECT policy on `customer_contacts` for drivers

