
-- Update quantity columns to support decimals
ALTER TABLE order_items 
ALTER COLUMN quantity TYPE NUMERIC(10,3);

-- Update product stock quantities to support decimals
ALTER TABLE products 
ALTER COLUMN stock_quantity TYPE NUMERIC(10,3);

-- Update product variant stock quantities to support decimals
ALTER TABLE product_variants 
ALTER COLUMN stock_quantity TYPE NUMERIC(10,3);

-- Update any existing integer values to maintain precision
-- (This is safe as integers will be automatically converted to decimals)

-- Add a comment to document the change
COMMENT ON COLUMN order_items.quantity IS 'Quantity can be decimal (e.g., 1.25 for 1 1/4 units)';
COMMENT ON COLUMN products.stock_quantity IS 'Stock quantity can be decimal for precise inventory tracking';
COMMENT ON COLUMN product_variants.stock_quantity IS 'Variant stock quantity can be decimal for precise inventory tracking';
