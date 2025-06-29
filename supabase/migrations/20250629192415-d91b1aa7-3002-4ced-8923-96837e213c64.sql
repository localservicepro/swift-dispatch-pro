
-- Create the orders_export table with the same structure as the view
CREATE TABLE public.orders_export (
  id uuid PRIMARY KEY,
  order_number text,
  purchase_order text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  
  -- Customer Information
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_first_name text,
  customer_last_name text,
  company_name text,
  business_name text,
  
  -- Address Information
  billing_address text,
  delivery_address text,
  suburb_name text,
  suburb_state text,
  suburb_postcode text,
  
  -- Financial Information
  subtotal numeric,
  adjustments numeric,
  delivery_fee numeric,
  total_amount numeric,
  payment_method text,
  payment_status text,
  
  -- Order Status and Assignment
  order_status text,
  delivery_method text,
  truck_type text,
  truck_registration text,
  assigned_truck_type text,
  driver_name text,
  
  -- Delivery Information
  delivery_date date,
  delivery_time time without time zone,
  
  -- Notes
  order_notes text,
  delivery_notes text,
  special_instructions text,
  
  -- Split Order Information
  is_split_order boolean,
  split_number integer,
  master_order_id uuid,
  
  -- Formatted fields
  products_formatted text,
  product_count integer,
  created_at_formatted text,
  delivery_date_formatted text,
  delivery_time_formatted text,
  
  -- Status and metadata
  record_status text,
  deleted_at timestamp with time zone,
  deleted_by_name text,
  
  -- Consolidated fields for export
  suburb_full text,
  truck_info text,
  delivery_schedule text,
  all_notes text
);

-- Create function to refresh a single order's export data
CREATE OR REPLACE FUNCTION refresh_order_export_data(order_id_param uuid) 
RETURNS void 
LANGUAGE plpgsql 
AS $$
BEGIN
  -- Delete existing record
  DELETE FROM public.orders_export WHERE id = order_id_param;
  
  -- Insert updated record from the view
  INSERT INTO public.orders_export
  SELECT 
    oev.id,
    oev.order_number,
    oev.purchase_order,
    oev.created_at,
    oev.updated_at,
    
    -- Customer Information
    oev.customer_name,
    oev.customer_phone,
    oev.customer_email,
    oev.customer_first_name,
    oev.customer_last_name,
    oev.company_name,
    oev.business_name,
    
    -- Address Information
    oev.billing_address,
    oev.delivery_address,
    oev.suburb_name,
    oev.suburb_state,
    oev.suburb_postcode,
    
    -- Financial Information
    oev.subtotal,
    oev.adjustments,
    oev.delivery_fee,
    oev.total_amount,
    oev.payment_method,
    oev.payment_status,
    
    -- Order Status and Assignment
    oev.order_status::text,
    oev.delivery_method::text,
    oev.truck_type::text,
    oev.truck_registration,
    oev.assigned_truck_type::text,
    oev.driver_name,
    
    -- Delivery Information
    oev.delivery_date,
    oev.delivery_time,
    
    -- Notes
    oev.order_notes,
    oev.delivery_notes,
    oev.special_instructions,
    
    -- Split Order Information
    oev.is_split_order,
    oev.split_number,
    oev.master_order_id,
    
    -- Formatted fields
    oev.products_formatted,
    oev.product_count,
    oev.created_at_formatted,
    oev.delivery_date_formatted,
    oev.delivery_time_formatted,
    
    -- Status and metadata
    oev.record_status,
    oev.deleted_at,
    oev.deleted_by_name,
    
    -- Consolidated fields
    CONCAT(oev.suburb_name, ', ', oev.suburb_state, ' ', oev.suburb_postcode) as suburb_full,
    CASE 
      WHEN oev.truck_registration IS NOT NULL THEN 
        CONCAT(oev.truck_registration, ' (', oev.assigned_truck_type, ')')
      WHEN oev.truck_type IS NOT NULL THEN 
        oev.truck_type::text
      ELSE 'Not Assigned'
    END as truck_info,
    CASE 
      WHEN oev.delivery_date IS NOT NULL AND oev.delivery_time IS NOT NULL THEN 
        CONCAT(oev.delivery_date_formatted, ' at ', oev.delivery_time_formatted)
      WHEN oev.delivery_date IS NOT NULL THEN 
        oev.delivery_date_formatted
      ELSE 'Not Scheduled'
    END as delivery_schedule,
    CONCAT_WS(' | ', 
      CASE WHEN oev.order_notes IS NOT NULL AND trim(oev.order_notes) != '' THEN 'Order: ' || oev.order_notes END,
      CASE WHEN oev.delivery_notes IS NOT NULL AND trim(oev.delivery_notes) != '' THEN 'Delivery: ' || oev.delivery_notes END,
      CASE WHEN oev.special_instructions IS NOT NULL AND trim(oev.special_instructions) != '' THEN 'Special: ' || oev.special_instructions END
    ) as all_notes
  FROM public.orders_export_view oev
  WHERE oev.id = order_id_param;
END;
$$;

-- Create trigger function for orders table
CREATE OR REPLACE FUNCTION handle_order_export_update() 
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Remove from export table
    DELETE FROM public.orders_export WHERE id = OLD.id;
    RETURN OLD;
  ELSE
    -- Refresh the export data for this order
    PERFORM refresh_order_export_data(COALESCE(NEW.id, OLD.id));
    RETURN COALESCE(NEW, OLD);
  END IF;
END;
$$;

-- Create trigger function for related tables (customers, profiles, trucks)
CREATE OR REPLACE FUNCTION handle_related_table_update() 
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
DECLARE
  order_record RECORD;
BEGIN
  -- Find affected orders and refresh their export data
  IF TG_TABLE_NAME = 'customers' THEN
    FOR order_record IN 
      SELECT id FROM public.orders WHERE customer_id = COALESCE(NEW.id, OLD.id)
    LOOP
      PERFORM refresh_order_export_data(order_record.id);
    END LOOP;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    FOR order_record IN 
      SELECT id FROM public.orders WHERE driver_id = COALESCE(NEW.id, OLD.id)
    LOOP
      PERFORM refresh_order_export_data(order_record.id);
    END LOOP;
  ELSIF TG_TABLE_NAME = 'trucks' THEN
    FOR order_record IN 
      SELECT id FROM public.orders WHERE truck_id = COALESCE(NEW.id, OLD.id)
    LOOP
      PERFORM refresh_order_export_data(order_record.id);
    END LOOP;
  ELSIF TG_TABLE_NAME = 'suburbs' THEN
    FOR order_record IN 
      SELECT o.id FROM public.orders o 
      JOIN public.customers c ON o.customer_id = c.id 
      WHERE c.suburb_id = COALESCE(NEW.id, OLD.id)
    LOOP
      PERFORM refresh_order_export_data(order_record.id);
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
CREATE TRIGGER orders_export_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_export_update();

CREATE TRIGGER customers_export_trigger
  AFTER UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION handle_related_table_update();

CREATE TRIGGER profiles_export_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_related_table_update();

CREATE TRIGGER trucks_export_trigger
  AFTER UPDATE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION handle_related_table_update();

CREATE TRIGGER suburbs_export_trigger
  AFTER UPDATE ON public.suburbs
  FOR EACH ROW EXECUTE FUNCTION handle_related_table_update();

-- Enable RLS on the orders_export table
ALTER TABLE public.orders_export ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (same as orders table)
CREATE POLICY "Enable read access for authenticated users" ON public.orders_export
  FOR SELECT USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON public.orders_export TO authenticated;
GRANT ALL ON public.orders_export TO service_role;

-- Populate initial data from the view
INSERT INTO public.orders_export
SELECT 
  oev.id,
  oev.order_number,
  oev.purchase_order,
  oev.created_at,
  oev.updated_at,
  
  -- Customer Information
  oev.customer_name,
  oev.customer_phone,
  oev.customer_email,
  oev.customer_first_name,
  oev.customer_last_name,
  oev.company_name,
  oev.business_name,
  
  -- Address Information
  oev.billing_address,
  oev.delivery_address,
  oev.suburb_name,
  oev.suburb_state,
  oev.suburb_postcode,
  
  -- Financial Information
  oev.subtotal,
  oev.adjustments,
  oev.delivery_fee,
  oev.total_amount,
  oev.payment_method,
  oev.payment_status,
  
  -- Order Status and Assignment
  oev.order_status::text,
  oev.delivery_method::text,
  oev.truck_type::text,
  oev.truck_registration,
  oev.assigned_truck_type::text,
  oev.driver_name,
  
  -- Delivery Information
  oev.delivery_date,
  oev.delivery_time,
  
  -- Notes
  oev.order_notes,
  oev.delivery_notes,
  oev.special_instructions,
  
  -- Split Order Information
  oev.is_split_order,
  oev.split_number,
  oev.master_order_id,
  
  -- Formatted fields
  oev.products_formatted,
  oev.product_count,
  oev.created_at_formatted,
  oev.delivery_date_formatted,
  oev.delivery_time_formatted,
  
  -- Status and metadata
  oev.record_status,
  oev.deleted_at,
  oev.deleted_by_name,
  
  -- Consolidated fields
  CONCAT(oev.suburb_name, ', ', oev.suburb_state, ' ', oev.suburb_postcode) as suburb_full,
  CASE 
    WHEN oev.truck_registration IS NOT NULL THEN 
      CONCAT(oev.truck_registration, ' (', oev.assigned_truck_type, ')')
    WHEN oev.truck_type IS NOT NULL THEN 
      oev.truck_type::text
    ELSE 'Not Assigned'
  END as truck_info,
  CASE 
    WHEN oev.delivery_date IS NOT NULL AND oev.delivery_time IS NOT NULL THEN 
      CONCAT(oev.delivery_date_formatted, ' at ', oev.delivery_time_formatted)
    WHEN oev.delivery_date IS NOT NULL THEN 
      oev.delivery_date_formatted
    ELSE 'Not Scheduled'
  END as delivery_schedule,
  CONCAT_WS(' | ', 
    CASE WHEN oev.order_notes IS NOT NULL AND trim(oev.order_notes) != '' THEN 'Order: ' || oev.order_notes END,
    CASE WHEN oev.delivery_notes IS NOT NULL AND trim(oev.delivery_notes) != '' THEN 'Delivery: ' || oev.delivery_notes END,
    CASE WHEN oev.special_instructions IS NOT NULL AND trim(oev.special_instructions) != '' THEN 'Special: ' || oev.special_instructions END
  ) as all_notes
FROM public.orders_export_view oev;
