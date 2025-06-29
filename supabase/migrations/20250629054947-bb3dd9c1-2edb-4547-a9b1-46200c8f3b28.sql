
-- First, let's modify the handle_new_user function to only create profiles for admin/driver roles
-- and not for customer signups from the shop
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if this is not a customer signup
  -- We can detect customer signups by checking if they have customer-specific metadata
  -- or by checking the signup source
  IF (NEW.raw_user_meta_data->>'role' IS NULL OR NEW.raw_user_meta_data->>'role' != 'customer') THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'admin'::public.user_role)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Clean up: Remove any existing customer profiles that shouldn't be there
-- This will remove profiles where the user also exists in the customers table
DELETE FROM public.profiles 
WHERE id IN (
  SELECT p.id 
  FROM public.profiles p 
  INNER JOIN public.customers c ON p.id = c.auth_user_id
);
