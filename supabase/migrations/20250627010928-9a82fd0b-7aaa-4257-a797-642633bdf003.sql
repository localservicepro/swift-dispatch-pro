
-- Fix the is_current_user_admin function to properly check admin role
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Remove the incomplete parameterless log_admin_activity function since we already have the working parameterized version
DROP FUNCTION IF EXISTS public.log_admin_activity();

-- Ensure the working log_admin_activity function with parameters is properly defined
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action_type text, 
  p_target_type text, 
  p_target_id uuid DEFAULT NULL::uuid, 
  p_target_details jsonb DEFAULT NULL::jsonb, 
  p_old_values jsonb DEFAULT NULL::jsonb, 
  p_new_values jsonb DEFAULT NULL::jsonb, 
  p_description text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    target_details,
    old_values,
    new_values,
    description
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_type,
    p_target_id,
    p_target_details,
    p_old_values,
    p_new_values,
    p_description
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;
