
-- Drop the existing view that depends on the columns we need to remove
DROP VIEW IF EXISTS product_pricing_simple;

-- Remove individual pricing columns from products table and simplify to single base price
ALTER TABLE products DROP COLUMN IF EXISTS account_price;
ALTER TABLE products DROP COLUMN IF EXISTS trade_price;

-- Update pricing_tiers table to include percentage-based pricing rules
ALTER TABLE pricing_tiers 
ADD COLUMN IF NOT EXISTS percentage_adjustment numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_markup boolean DEFAULT false;

-- Update existing pricing tiers with proper percentage adjustments
UPDATE pricing_tiers 
SET 
  percentage_adjustment = 0,
  is_markup = false,
  description = 'Regular customers - base price'
WHERE name = 'trade';

UPDATE pricing_tiers 
SET 
  percentage_adjustment = 10,
  is_markup = false,
  description = 'VIP customers - 10% discount off base price'
WHERE name = 'account';

-- Remove individual pricing columns from product_variants table
ALTER TABLE product_variants DROP COLUMN IF EXISTS account_price;
ALTER TABLE product_variants DROP COLUMN IF EXISTS trade_price;

-- Create a new view for calculated product pricing based on tiers
CREATE OR REPLACE VIEW product_pricing_calculated AS
SELECT 
  p.id as product_id,
  p.name,
  p.price as base_price,
  pv.id as variant_id,
  pv.variant_name,
  pv.price_adjustment,
  COALESCE(p.price + pv.price_adjustment, p.price) as variant_base_price,
  -- Calculate trade price (regular customers)
  CASE 
    WHEN trade_tier.is_markup THEN 
      COALESCE(p.price + pv.price_adjustment, p.price) * (1 + trade_tier.percentage_adjustment / 100)
    ELSE 
      COALESCE(p.price + pv.price_adjustment, p.price) * (1 - trade_tier.percentage_adjustment / 100)
  END as trade_price,
  -- Calculate account price (VIP customers)
  CASE 
    WHEN account_tier.is_markup THEN 
      COALESCE(p.price + pv.price_adjustment, p.price) * (1 + account_tier.percentage_adjustment / 100)
    ELSE 
      COALESCE(p.price + pv.price_adjustment, p.price) * (1 - account_tier.percentage_adjustment / 100)
  END as account_price
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
CROSS JOIN (SELECT percentage_adjustment, is_markup FROM pricing_tiers WHERE name = 'trade') trade_tier
CROSS JOIN (SELECT percentage_adjustment, is_markup FROM pricing_tiers WHERE name = 'account') account_tier
WHERE p.is_active = true;

-- Create function to get pricing for a specific customer type
CREATE OR REPLACE FUNCTION get_product_price(
  product_id_param UUID,
  variant_id_param UUID DEFAULT NULL,
  customer_type_param TEXT DEFAULT 'trade'
) RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  base_price NUMERIC;
  adjustment NUMERIC := 0;
  tier_adjustment NUMERIC := 0;
  is_markup BOOLEAN := false;
BEGIN
  -- Get base price
  SELECT price INTO base_price FROM products WHERE id = product_id_param;
  
  -- Get variant adjustment if variant specified
  IF variant_id_param IS NOT NULL THEN
    SELECT COALESCE(price_adjustment, 0) INTO adjustment 
    FROM product_variants 
    WHERE id = variant_id_param;
  END IF;
  
  -- Get tier adjustment
  SELECT percentage_adjustment, pricing_tiers.is_markup 
  INTO tier_adjustment, is_markup
  FROM pricing_tiers 
  WHERE name = customer_type_param;
  
  -- Calculate final price
  IF is_markup THEN
    RETURN (base_price + adjustment) * (1 + tier_adjustment / 100);
  ELSE
    RETURN (base_price + adjustment) * (1 - tier_adjustment / 100);
  END IF;
END;
$$;
