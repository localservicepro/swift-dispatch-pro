
-- Step 1: Add products_formatted column to orders table
ALTER TABLE public.orders ADD COLUMN products_formatted TEXT;

-- Step 2: Create function to format products JSONB into readable text
CREATE OR REPLACE FUNCTION format_products_text(products_json jsonb)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  formatted_text TEXT := '';
  product_item jsonb;
  product_name TEXT;
  product_price NUMERIC;
  product_quantity NUMERIC;
  item_text TEXT;
BEGIN
  -- Handle null or empty products
  IF products_json IS NULL OR jsonb_array_length(products_json) = 0 THEN
    RETURN 'No products';
  END IF;
  
  -- Loop through each product in the JSONB array
  FOR product_item IN SELECT * FROM jsonb_array_elements(products_json)
  LOOP
    -- Extract product details with fallback names
    product_name := COALESCE(product_item->>'name', product_item->>'product_name', 'Product');
    product_price := COALESCE((product_item->>'price')::numeric, (product_item->>'unit_price')::numeric, 0);
    product_quantity := COALESCE((product_item->>'quantity')::numeric, 1);
    
    -- Format individual product text
    item_text := product_name || ' $' || product_price::text || ' (Qty: ' || product_quantity::text || ')';
    
    -- Add to formatted text with comma separator
    IF formatted_text = '' THEN
      formatted_text := item_text;
    ELSE
      formatted_text := formatted_text || ', ' || item_text;
    END IF;
  END LOOP;
  
  RETURN formatted_text;
END;
$$;

-- Step 3: Create trigger function to automatically update products_formatted
CREATE OR REPLACE FUNCTION update_products_formatted()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.products_formatted := format_products_text(NEW.products);
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger on orders table
CREATE TRIGGER trigger_update_products_formatted
  BEFORE INSERT OR UPDATE OF products ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_products_formatted();

-- Step 5: Backfill existing orders with formatted products
UPDATE public.orders 
SET products_formatted = format_products_text(products)
WHERE products_formatted IS NULL;
