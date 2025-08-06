-- Fix the final remaining database functions to have proper search_path

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_order(p_order_id uuid, p_reason text DEFAULT 'Admin deletion'::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.orders 
  SET 
    deleted_at = now(),
    deleted_by = auth.uid(),
    updated_at = now()
  WHERE id = p_order_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or already deleted';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_delivery_status_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  customer_email TEXT;
  driver_name TEXT;
BEGIN
  -- Only send email if status actually changed and we're updating (not inserting)
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get customer email from customers table if customer_id exists
    IF NEW.customer_id IS NOT NULL THEN
      SELECT email INTO customer_email
      FROM public.customers
      WHERE id = NEW.customer_id;
    END IF;
    
    -- Get driver name if driver is assigned
    IF NEW.driver_id IS NOT NULL THEN
      SELECT full_name INTO driver_name
      FROM public.profiles
      WHERE id = NEW.driver_id;
    END IF;
    
    -- Only send email if we have a customer email
    IF customer_email IS NOT NULL AND customer_email != '' THEN
      -- Use a background job to send email to avoid blocking the transaction
      PERFORM pg_notify('send_status_update', json_build_object(
        'order_id', NEW.id,
        'customer_name', NEW.customer_name,
        'customer_email', customer_email,
        'order_number', NEW.order_number,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'driver_name', driver_name
      )::text);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_admin_activity(p_action_type text, p_target_type text, p_target_id uuid DEFAULT NULL::uuid, p_target_details jsonb DEFAULT NULL::jsonb, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.create_driver(driver_id uuid, driver_name text, driver_license text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.drivers (id, name, license)
    VALUES (driver_id, driver_name, driver_license);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_split_order(p_master_order_data jsonb, p_split_orders jsonb[])
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  master_order_id uuid;
  split_order_ids uuid[] := '{}';
  split_order jsonb;
  split_order_id uuid;
  split_number int := 1;
BEGIN
  -- Create master order
  master_order_id := public.create_single_order(
    p_master_order_data || jsonb_build_object('is_split_order', true)
  );

  -- Create split orders
  FOREACH split_order IN ARRAY p_split_orders
  LOOP
    split_order_id := public.create_single_order(
      split_order || jsonb_build_object(
        'is_split_order', true,
        'master_order_id', master_order_id,
        'split_number', split_number
      )
    );
    
    split_order_ids := array_append(split_order_ids, split_order_id);
    split_number := split_number + 1;
  END LOOP;

  -- Return all order IDs (master + splits)
  RETURN array_prepend(master_order_id, split_order_ids);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_specials_for_product(product_id_param uuid, customer_tier_param text DEFAULT 'trade'::text)
 RETURNS TABLE(special_id uuid, special_name text, discount_type discount_type, discount_value numeric, end_date timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.name,
    ps.discount_type,
    ps.discount_value,
    ps.end_date
  FROM public.product_specials ps
  JOIN public.product_special_items psi ON ps.id = psi.special_id
  WHERE ps.is_active = true
    AND ps.start_date <= now()
    AND ps.end_date >= now()
    AND customer_tier_param = ANY(ps.customer_tiers)
    AND (
      psi.product_id = product_id_param OR
      psi.category_id IN (
        SELECT category_id FROM public.products WHERE id = product_id_param
      )
    )
  ORDER BY ps.discount_value DESC
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_special_price(base_price numeric, product_id_param uuid, customer_tier_param text DEFAULT 'trade'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  special_discount NUMERIC := 0;
  special_type public.discount_type;
  final_price NUMERIC;
BEGIN
  -- Get the best active special for this product
  SELECT discount_value, discount_type 
  INTO special_discount, special_type
  FROM public.get_active_specials_for_product(product_id_param, customer_tier_param)
  LIMIT 1;
  
  -- Apply special discount if found
  IF special_discount > 0 THEN
    IF special_type = 'percentage' THEN
      final_price := base_price * (1 - special_discount / 100);
    ELSE
      final_price := base_price - special_discount;
    END IF;
    
    -- Ensure price doesn't go below 0
    final_price := GREATEST(final_price, 0);
  ELSE
    final_price := base_price;
  END IF;
  
  RETURN final_price;
END;
$function$;