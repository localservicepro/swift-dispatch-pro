
-- Create enum for special types
CREATE TYPE public.special_type AS ENUM ('monthly', 'limited_time', 'flash_sale', 'seasonal', 'customer_tier');

-- Create enum for discount types
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed_amount');

-- Create product_specials table
CREATE TABLE public.product_specials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  special_type public.special_type NOT NULL DEFAULT 'limited_time',
  discount_type public.discount_type NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  customer_tiers TEXT[] DEFAULT ARRAY['trade', 'account'],
  minimum_quantity INTEGER DEFAULT 1,
  maximum_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  promotional_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  CONSTRAINT valid_discount CHECK (
    (discount_type = 'percentage' AND discount_value <= 100) OR
    (discount_type = 'fixed_amount' AND discount_value > 0)
  )
);

-- Create junction table for products in specials
CREATE TABLE public.product_special_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  special_id UUID NOT NULL REFERENCES public.product_specials(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT product_or_category CHECK (
    (product_id IS NOT NULL AND category_id IS NULL) OR
    (product_id IS NULL AND category_id IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_product_specials_active_dates ON public.product_specials (is_active, start_date, end_date);
CREATE INDEX idx_product_special_items_special_id ON public.product_special_items (special_id);
CREATE INDEX idx_product_special_items_product_id ON public.product_special_items (product_id);
CREATE INDEX idx_product_special_items_category_id ON public.product_special_items (category_id);

-- Enable RLS
ALTER TABLE public.product_specials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_special_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users to read active specials
CREATE POLICY "Anyone can view active specials" ON public.product_specials
  FOR SELECT TO authenticated
  USING (is_active = true AND start_date <= now() AND end_date >= now());

CREATE POLICY "Anyone can view special items" ON public.product_special_items
  FOR SELECT TO authenticated
  USING (true);

-- Admin policies for full access
CREATE POLICY "Admins can manage specials" ON public.product_specials
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage special items" ON public.product_special_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to get active specials for a product
CREATE OR REPLACE FUNCTION public.get_active_specials_for_product(
  product_id_param UUID,
  customer_tier_param TEXT DEFAULT 'trade'
)
RETURNS TABLE (
  special_id UUID,
  special_name TEXT,
  discount_type public.discount_type,
  discount_value NUMERIC,
  end_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.name,
    ps.discount_type,
    ps.discount_value,
    ps.end_date
  FROM public.product_specials ps
  JOIN public.product_special_items psi ON ps.id = psi.special_id
  WHERE ps.is_active = true
    AND ps.start_date <= now()
    AND ps.end_date >= now()
    AND customer_tier_param = ANY(ps.customer_tiers)
    AND (
      psi.product_id = product_id_param OR
      psi.category_id IN (
        SELECT category_id FROM public.products WHERE id = product_id_param
      )
    )
  ORDER BY ps.discount_value DESC
  LIMIT 1;
END;
$$;

-- Create function to calculate special price
CREATE OR REPLACE FUNCTION public.calculate_special_price(
  base_price NUMERIC,
  product_id_param UUID,
  customer_tier_param TEXT DEFAULT 'trade'
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  special_discount NUMERIC := 0;
  special_type public.discount_type;
  final_price NUMERIC;
BEGIN
  -- Get the best active special for this product
  SELECT discount_value, discount_type 
  INTO special_discount, special_type
  FROM public.get_active_specials_for_product(product_id_param, customer_tier_param)
  LIMIT 1;
  
  -- Apply special discount if found
  IF special_discount > 0 THEN
    IF special_type = 'percentage' THEN
      final_price := base_price * (1 - special_discount / 100);
    ELSE
      final_price := base_price - special_discount;
    END IF;
    
    -- Ensure price doesn't go below 0
    final_price := GREATEST(final_price, 0);
  ELSE
    final_price := base_price;
  END IF;
  
  RETURN final_price;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.product_specials TO authenticated;
GRANT SELECT ON public.product_special_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_specials_for_product TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_special_price TO authenticated;
