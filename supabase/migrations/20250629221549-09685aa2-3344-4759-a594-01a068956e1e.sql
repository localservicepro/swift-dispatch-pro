
-- Step 1: Add new columns to orders table
ALTER TABLE public.orders 
ADD COLUMN driver_name TEXT,
ADD COLUMN truck_registration TEXT,
ADD COLUMN truck_type_display TEXT;

-- Step 2: Create function to get truck display info
CREATE OR REPLACE FUNCTION get_truck_display_info(truck_type_param truck_type)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  CASE truck_type_param
    WHEN 'small' THEN RETURN 'Small Truck';
    WHEN 'medium' THEN RETURN 'Medium Truck';
    WHEN 'large' THEN RETURN 'Large Truck';
    WHEN 'crane' THEN RETURN 'Crane Truck';
    ELSE RETURN 'Unknown Truck';
  END CASE;
END;
$$;

-- Step 3: Create function to populate driver and truck info
CREATE OR REPLACE FUNCTION populate_order_driver_truck_info()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  driver_full_name TEXT;
  truck_reg TEXT;
  truck_display TEXT;
BEGIN
  -- Get driver name if driver_id is provided
  IF NEW.driver_id IS NOT NULL THEN
    SELECT full_name INTO driver_full_name
    FROM public.profiles
    WHERE id = NEW.driver_id;
    
    NEW.driver_name := COALESCE(driver_full_name, 'Unknown Driver');
  ELSE
    NEW.driver_name := NULL;
  END IF;

  -- Get truck info if truck_id is provided
  IF NEW.truck_id IS NOT NULL THEN
    SELECT registration_number INTO truck_reg
    FROM public.trucks
    WHERE id = NEW.truck_id;
    
    NEW.truck_registration := truck_reg;
  ELSE
    NEW.truck_registration := NULL;
  END IF;

  -- Get truck type display
  IF NEW.truck_type IS NOT NULL THEN
    NEW.truck_type_display := get_truck_display_info(NEW.truck_type);
  ELSE
    NEW.truck_type_display := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 4: Create trigger to auto-populate the fields
CREATE TRIGGER trigger_populate_order_driver_truck_info
  BEFORE INSERT OR UPDATE OF driver_id, truck_id, truck_type ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION populate_order_driver_truck_info();

-- Step 5: Backfill existing orders with driver and truck information
UPDATE public.orders 
SET 
  driver_name = COALESCE(profiles.full_name, 'Not Assigned'),
  truck_registration = trucks.registration_number,
  truck_type_display = get_truck_display_info(orders.truck_type)
FROM public.profiles, public.trucks
WHERE 
  (orders.driver_id = profiles.id OR orders.driver_id IS NULL)
  AND (orders.truck_id = trucks.id OR orders.truck_id IS NULL);

-- Handle orders without driver assignment
UPDATE public.orders 
SET driver_name = 'Not Assigned'
WHERE driver_id IS NULL AND driver_name IS NULL;
