-- Add super_admin role to user tagabmcjay@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('87ef7c3e-f377-4869-8f9c-24ae741f1092', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;