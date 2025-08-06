-- Fix the last remaining database functions to have proper search_path

CREATE OR REPLACE FUNCTION public.send_order_confirmation_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  customer_email TEXT;
BEGIN
  -- Only send email for new orders (INSERT operations)
  IF TG_OP = 'INSERT' THEN
    -- Get customer email from customers table if customer_id exists
    IF NEW.customer_id IS NOT NULL THEN
      SELECT email INTO customer_email
      FROM public.customers
      WHERE id = NEW.customer_id;
    END IF;
    
    -- Only send email if we have a customer email
    IF customer_email IS NOT NULL AND customer_email != '' THEN
      -- Use a background job to send email to avoid blocking the transaction
      PERFORM pg_notify('send_order_confirmation', json_build_object(
        'order_id', NEW.id,
        'customer_name', NEW.customer_name,
        'customer_email', customer_email,
        'order_number', NEW.order_number,
        'order_items', NEW.products,
        'total_amount', NEW.total_amount,
        'delivery_address', NEW.customer_address,
        'delivery_date', NEW.delivery_date,
        'delivery_time', NEW.delivery_time,
        'special_instructions', NEW.special_instructions
      )::text);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_status(order_id uuid, new_status order_status, notes text DEFAULT NULL::text, location jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    old_status order_status;
    current_driver_id UUID;
    user_role user_role;
    current_user_id UUID;
    order_exists BOOLEAN;
BEGIN
    -- Get current user info
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to update order status';
    END IF;
    
    -- Get user role from profiles table
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = current_user_id;

    IF user_role IS NULL THEN
        RAISE EXCEPTION 'User profile not found for user %', current_user_id;
    END IF;

    -- Get current order status and driver, check if order exists
    SELECT status, driver_id, TRUE INTO old_status, current_driver_id, order_exists
    FROM public.orders WHERE id = order_id;

    -- Check if order exists
    IF old_status IS NULL OR order_exists IS NULL THEN
        RAISE EXCEPTION 'Order with ID % not found', order_id;
    END IF;

    -- Check permissions: admins can update any order, drivers can only update their assigned orders
    IF user_role = 'admin' THEN
        -- Admins can update any order
        UPDATE public.orders 
        SET status = new_status, updated_at = NOW()
        WHERE id = order_id;
        
        RAISE NOTICE 'Admin % updated order % status from % to %', current_user_id, order_id, old_status, new_status;
        
    ELSIF user_role = 'driver' THEN
        -- Drivers can only update orders assigned to them
        -- Handle case where driver_id might be NULL
        IF current_driver_id IS NULL THEN
            RAISE EXCEPTION 'Order % is not assigned to any driver', order_id;
        END IF;
        
        IF current_driver_id != current_user_id THEN
            RAISE EXCEPTION 'Driver % can only update orders assigned to them. Order % is assigned to driver %', 
                current_user_id, order_id, current_driver_id;
        END IF;
        
        UPDATE public.orders 
        SET status = new_status, updated_at = NOW()
        WHERE id = order_id AND driver_id = current_user_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update order % - driver assignment mismatch', order_id;
        END IF;
        
        RAISE NOTICE 'Driver % updated assigned order % status from % to %', current_user_id, order_id, old_status, new_status;
        
    ELSE
        RAISE EXCEPTION 'User % with role % has insufficient permissions to update order status', current_user_id, user_role;
    END IF;

    -- Insert status update record with better error handling
    BEGIN
        INSERT INTO public.delivery_status_updates (
            order_id, driver_id, old_status, new_status, notes, location, created_at
        ) VALUES (
            order_id, current_user_id, old_status, new_status, notes, location, NOW()
        );
    EXCEPTION
        WHEN others THEN
            RAISE WARNING 'Failed to log status update for order %: %', order_id, SQLERRM;
            -- Don't fail the entire operation if logging fails
    END;

EXCEPTION
    WHEN others THEN
        -- Log the error details with more context
        RAISE EXCEPTION 'Failed to update order % status from % to % by user % (role: %): %', 
            order_id, old_status, new_status, current_user_id, user_role, SQLERRM;
END;
$function$;