-- Fix the auto_manage_inventory function to use valid order_status enum values
-- and ensure the trigger is properly attached

-- First, drop and recreate the auto_manage_inventory function with correct enum values
DROP FUNCTION IF EXISTS public.auto_manage_inventory() CASCADE;

CREATE OR REPLACE FUNCTION public.auto_manage_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Deduct inventory when order moves to preparing, loading, or en_route
  IF (OLD.status != NEW.status) AND 
     (NEW.status IN ('preparing', 'loading', 'en_route')) AND
     (OLD.status NOT IN ('preparing', 'loading', 'en_route', 'delivered')) THEN
    
    PERFORM deduct_inventory(NEW.id);
    
  -- Restore inventory when order is cancelled or deleted
  ELSIF (OLD.status != NEW.status) AND 
        (NEW.status = 'cancelled') AND
        (OLD.status IN ('preparing', 'loading', 'en_route')) THEN
    
    PERFORM restore_inventory(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger is properly attached to the orders table
DROP TRIGGER IF EXISTS trigger_auto_manage_inventory ON public.orders;

CREATE TRIGGER trigger_auto_manage_inventory
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_manage_inventory();