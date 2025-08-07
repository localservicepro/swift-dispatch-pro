-- Update the update_order_status function to handle truck status changes
CREATE OR REPLACE FUNCTION public.update_order_status(order_id uuid, new_status order_status, notes text DEFAULT NULL::text, location jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    old_status order_status;
    current_driver_id UUID;
    current_truck_id UUID;
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

    -- Get current order status, driver, truck, and check if order exists
    SELECT status, driver_id, truck_id, TRUE INTO old_status, current_driver_id, current_truck_id, order_exists
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

    -- Handle truck status updates when order is completed or cancelled
    IF current_truck_id IS NOT NULL THEN
        -- If order is being completed (delivered) or cancelled, free up the truck
        IF new_status IN ('delivered', 'cancelled') AND old_status NOT IN ('delivered', 'cancelled') THEN
            UPDATE public.trucks 
            SET status = 'available', updated_at = NOW()
            WHERE id = current_truck_id;
            
            RAISE NOTICE 'Truck % status updated to available due to order % completion/cancellation', current_truck_id, order_id;
        
        -- If order is being assigned to active status, mark truck as assigned
        ELSIF new_status IN ('preparing', 'loading', 'en_route') AND old_status NOT IN ('preparing', 'loading', 'en_route', 'delivered') THEN
            UPDATE public.trucks 
            SET status = 'assigned', updated_at = NOW()
            WHERE id = current_truck_id;
            
            RAISE NOTICE 'Truck % status updated to assigned due to order % activation', current_truck_id, order_id;
        END IF;
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

-- Fix existing orphaned truck statuses by setting trucks to available if they have no active orders
UPDATE public.trucks 
SET status = 'available', updated_at = NOW()
WHERE status = 'assigned' 
AND id NOT IN (
    SELECT DISTINCT truck_id 
    FROM public.orders 
    WHERE truck_id IS NOT NULL 
    AND status NOT IN ('delivered', 'cancelled') 
    AND deleted_at IS NULL
);