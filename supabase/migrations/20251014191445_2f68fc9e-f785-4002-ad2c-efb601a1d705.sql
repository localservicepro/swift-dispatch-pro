-- Fix the user's account: Remove account_customer role and ensure admin role
DELETE FROM user_roles
WHERE user_id = '87ef7c3e-f377-4869-8f9c-24ae741f1092'
AND role = 'account_customer';

-- Ensure admin role exists (without customer_id link)
INSERT INTO user_roles (user_id, role, customer_id)
VALUES ('87ef7c3e-f377-4869-8f9c-24ae741f1092', 'admin', NULL)
ON CONFLICT (user_id, role) DO NOTHING;