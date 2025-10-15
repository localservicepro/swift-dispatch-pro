-- Migrate existing roles from profiles to user_roles table
-- This ensures all users have their roles properly stored in the user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::public.user_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;