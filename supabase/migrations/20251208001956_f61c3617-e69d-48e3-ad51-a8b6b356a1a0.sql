-- Fix handle_new_user_secure function to properly resolve user_role type
CREATE OR REPLACE FUNCTION public.handle_new_user_secure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.raw_user_meta_data ? 'role' THEN
    -- Insert into profiles table
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'driver'::public.user_role)
    );
    
    -- Also insert into user_roles table
    INSERT INTO public.user_roles (user_id, role, customer_id)
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'driver'::public.user_role),
      NULL
    )
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'User created by admin: % with role: %', NEW.email, NEW.raw_user_meta_data->>'role';
  ELSE
    RAISE WARNING 'Unauthorized signup attempt blocked for email: %', NEW.email;
    RAISE EXCEPTION 'Self-registration is not allowed. Please contact your administrator for access.';
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user_secure: %', SQLERRM;
    RAISE;
END;
$function$;