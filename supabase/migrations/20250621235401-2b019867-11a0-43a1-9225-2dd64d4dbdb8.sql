
-- Fix the product_pricing_calculated view creation error by using CREATE OR REPLACE
DROP VIEW IF EXISTS public.product_pricing_calculated;

CREATE OR REPLACE VIEW public.product_pricing_calculated AS
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

-- Ensure proper permissions by granting necessary access
GRANT SELECT ON public.product_pricing_calculated TO authenticated;
GRANT SELECT ON public.product_pricing_calculated TO anon;
