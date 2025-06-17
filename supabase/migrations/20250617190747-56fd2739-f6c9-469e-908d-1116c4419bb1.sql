
-- Update the update_order_status function to handle both admin and driver permissions
CREATE OR REPLACE FUNCTION public.update_order_status(
    order_id uuid, 
    new_status order_status, 
    notes text DEFAULT NULL::text, 
    location jsonb DEFAULT NULL::jsonb
)
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
    PERFORM set_config('search_path', '', false);

    -- Get current user info
    current_user_id := auth.uid();
    
    -- Get user role from profiles table
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = current_user_id;

    -- Get current order status and driver
    SELECT status, driver_id INTO old_status, current_driver_id
    FROM public.orders WHERE id = order_id;

    -- Check permissions: admins can update any order, drivers can only update their assigned orders
    IF user_role = 'admin' OR user_role = 'customer' THEN
        -- Admins and customers (for admin interface) can update any order
        UPDATE public.orders 
        SET status = new_status, updated_at = NOW()
        WHERE id = order_id;
    ELSIF user_role = 'driver' THEN
        -- Drivers can only update orders assigned to them
        UPDATE public.orders 
        SET status = new_status, updated_at = NOW()
        WHERE id = order_id AND driver_id = current_user_id;
    ELSE
        RAISE EXCEPTION 'Insufficient permissions to update order status';
    END IF;

    -- Check if update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or permission denied';
    END IF;

    -- Insert status update record
    INSERT INTO public.delivery_status_updates (
        order_id, driver_id, old_status, new_status, notes, location
    ) VALUES (
        order_id, current_user_id, old_status, new_status, notes, location
    );

    -- Log successful update
    RAISE NOTICE 'Order % status updated from % to % by user %', order_id, old_status, new_status, current_user_id;

EXCEPTION
    WHEN others THEN
        -- Log the error details
        RAISE EXCEPTION 'Failed to update order status: %', SQLERRM;
END;
$$;
