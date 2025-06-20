
-- Simplify pricing_tiers to only Trade and Account
DELETE FROM pricing_tiers WHERE name NOT IN ('trade', 'account');

-- Insert the two required pricing tiers if they don't exist
INSERT INTO pricing_tiers (name, display_name, description, is_default, is_active)
VALUES 
  ('account', 'Account', 'Standard account pricing', true, true),
  ('trade', 'Trade', 'Trade customer pricing with discounts', false, true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = true;

-- Add trade and account price columns directly to products table for simpler pricing
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS account_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS trade_price numeric DEFAULT 0;

-- Update existing products to use account_price as the current price
UPDATE products SET account_price = price WHERE account_price = 0;
UPDATE products SET trade_price = price * 0.9 WHERE trade_price = 0; -- 10% discount for trade

-- Add trade and account prices to product_variants as well
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS account_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS trade_price numeric DEFAULT 0;

-- Create a simplified view for product pricing
CREATE OR REPLACE VIEW product_pricing_simple AS
SELECT 
  p.id,
  p.name,
  p.account_price,
  p.trade_price,
  pv.id as variant_id,
  pv.variant_name,
  COALESCE(pv.account_price, p.account_price) as final_account_price,
  COALESCE(pv.trade_price, p.trade_price) as final_trade_price
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
WHERE p.is_active = true;
