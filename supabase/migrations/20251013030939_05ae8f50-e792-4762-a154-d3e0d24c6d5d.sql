-- Step 1: Fix user_roles - Remove admin role for the user
DELETE FROM public.user_roles
WHERE user_id = '87ef7c3e-f377-4869-8f9c-24ae741f1092'
  AND role = 'admin';

-- Step 2: Ensure account_customer role exists with correct customer_id
INSERT INTO public.user_roles (user_id, role, customer_id)
VALUES ('87ef7c3e-f377-4869-8f9c-24ae741f1092', 'account_customer', '0c4f15ad-2a66-4e07-b858-6fb80ef66375')
ON CONFLICT (user_id, role) 
DO UPDATE SET 
  customer_id = EXCLUDED.customer_id,
  updated_at = now();

-- Step 3: Unlink all other customers from this auth user
UPDATE public.customers
SET auth_user_id = NULL, updated_at = now()
WHERE auth_user_id = '87ef7c3e-f377-4869-8f9c-24ae741f1092'
  AND id <> '0c4f15ad-2a66-4e07-b858-6fb80ef66375';

-- Step 4: Ensure the chosen customer is linked to the auth user
UPDATE public.customers
SET auth_user_id = '87ef7c3e-f377-4869-8f9c-24ae741f1092', updated_at = now()
WHERE id = '0c4f15ad-2a66-4e07-b858-6fb80ef66375';