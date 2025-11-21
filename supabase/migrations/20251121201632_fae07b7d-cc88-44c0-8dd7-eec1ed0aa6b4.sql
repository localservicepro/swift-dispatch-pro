-- Update the trigger function to generate suffixes for split orders
CREATE OR REPLACE FUNCTION set_short_order_number()
RETURNS TRIGGER AS $$
DECLARE
  new_order_number TEXT;
  master_order_number TEXT;
  suffix_letter CHAR(1);
BEGIN
  -- Only generate order number if it's empty
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    
    -- Check if this is a split order (has master_order_id)
    IF NEW.master_order_id IS NOT NULL THEN
      -- Get the master order's number
      SELECT order_number INTO master_order_number
      FROM orders
      WHERE id = NEW.master_order_id;
      
      -- Generate suffix letter based on split_number
      -- 1→A, 2→B, 3→C, etc.
      suffix_letter := CHR(64 + NEW.split_number); -- ASCII: 65='A', 66='B', etc.
      
      -- Combine master number with suffix: ORD-531082-A
      NEW.order_number := master_order_number || '-' || suffix_letter;
    ELSE
      -- Regular order or master order - generate new number
      NEW.order_number := 'ORD-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
      
      -- Ensure uniqueness for non-split orders
      WHILE EXISTS (SELECT 1 FROM orders WHERE order_number = NEW.order_number) LOOP
        NEW.order_number := 'ORD-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';