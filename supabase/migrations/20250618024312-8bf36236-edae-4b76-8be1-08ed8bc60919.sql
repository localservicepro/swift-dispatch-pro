
-- Fix the update_order_status function to properly handle admin permissions
CREATE OR REPLACE FUNCTION public.update_order_status(order_id uuid, new_status order_status, notes text DEFAULT NULL::text, location jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_status order_status;
    current_driver_id UUID;
    user_role user_role;
    current_user_id UUID;
BEGIN
    -- Set a fixed search path
    PERFORM set_config('search_path', 'public', false);

    -- Get current user info
    current_user_id := auth.uid();
    
    -- Get user role from profiles table
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = current_user_id;

    -- Get current order status and driver
    SELECT status, driver_id INTO old_status, current_driver_id
    FROM public.orders WHERE id = order_id;

    -- Check if order exists
    IF old_status IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Check permissions: admins can update any order, drivers can only update their assigned orders
    IF user_role = 'admin' THEN
        -- Admins can update any order
        UPDATE public.orders 
        SET status = new_status, updated_at = NOW()
        WHERE id = order_id;
    ELSIF user_role = 'driver' THEN
        -- Drivers can only update orders assigned to them
        IF current_driver_id != current_user_id THEN
            RAISE EXCEPTION 'Driver can only update orders assigned to them';
        END IF;
        
        UPDATE public.orders 
        SET status = new_status, updated_at = NOW()
        WHERE id = order_id AND driver_id = current_user_id;
    ELSE
        RAISE EXCEPTION 'Insufficient permissions to update order status';
    END IF;

    -- Check if update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update order status';
    END IF;

    -- Insert status update record
    INSERT INTO public.delivery_status_updates (
        order_id, driver_id, old_status, new_status, notes, location, created_at
    ) VALUES (
        order_id, current_user_id, old_status, new_status, notes, location, NOW()
    );

    -- Log successful update
    RAISE NOTICE 'Order % status updated from % to % by user % with role %', order_id, old_status, new_status, current_user_id, user_role;

EXCEPTION
    WHEN others THEN
        -- Log the error details
        RAISE EXCEPTION 'Failed to update order status: %', SQLERRM;
END;
$$;

-- Ensure email triggers are properly set up
DROP TRIGGER IF EXISTS order_confirmation_email_trigger ON public.orders;
DROP TRIGGER IF EXISTS delivery_status_email_trigger ON public.orders;

-- Recreate order confirmation trigger
CREATE TRIGGER order_confirmation_email_trigger
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.send_order_confirmation_email();

-- Recreate delivery status update trigger  
CREATE TRIGGER delivery_status_email_trigger
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.send_delivery_status_email();
