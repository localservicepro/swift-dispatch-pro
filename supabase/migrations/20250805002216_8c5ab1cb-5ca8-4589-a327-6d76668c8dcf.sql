-- Fix critical RLS policy issues

-- 1. Restrict customer_pricing_tiers to admins only
DROP POLICY IF EXISTS "Allow all operations" ON public.customer_pricing_tiers;
CREATE POLICY "Admins can manage customer pricing tiers" ON public.customer_pricing_tiers
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Fix overly permissive invoices policies
DROP POLICY IF EXISTS "Service role can access all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view all invoices" ON public.invoices;

CREATE POLICY "Admins can manage all invoices" ON public.invoices
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Service role can manage invoices" ON public.invoices
FOR ALL USING (auth.role() = 'service_role');

-- 3. Restrict pricing_tiers to read-only for authenticated users
DROP POLICY IF EXISTS "Allow all operations" ON public.pricing_tiers;
CREATE POLICY "Authenticated users can view pricing tiers" ON public.pricing_tiers
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage pricing tiers" ON public.pricing_tiers
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Restrict product attribute tables to proper access
DROP POLICY IF EXISTS "Allow all operations" ON public.product_attributes;
CREATE POLICY "Anyone can view product attributes" ON public.product_attributes
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage product attributes" ON public.product_attributes
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Allow all operations" ON public.product_attribute_values;
CREATE POLICY "Anyone can view product attribute values" ON public.product_attribute_values
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage product attribute values" ON public.product_attribute_values
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Restrict product variants and related tables
DROP POLICY IF EXISTS "Allow all operations" ON public.product_variants;
CREATE POLICY "Anyone can view active product variants" ON public.product_variants
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage product variants" ON public.product_variants
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Allow all operations" ON public.product_variant_attributes;
CREATE POLICY "Anyone can view product variant attributes" ON public.product_variant_attributes
FOR SELECT USING (true);

CREATE POLICY "Admins can manage product variant attributes" ON public.product_variant_attributes
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Allow all operations" ON public.product_pricing;
CREATE POLICY "Anyone can view active product pricing" ON public.product_pricing
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage product pricing" ON public.product_pricing
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Secure database functions by adding proper search_path
CREATE OR REPLACE FUNCTION public.check_stock_availability(order_items jsonb)
 RETURNS TABLE(product_id uuid, product_name text, requested_quantity numeric, available_stock numeric, is_sufficient boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (item->>'id')::uuid as product_id,
    p.name as product_name,
    (item->>'quantity')::numeric as requested_quantity,
    p.stock_quantity as available_stock,
    (p.stock_quantity >= (item->>'quantity')::numeric) as is_sufficient
  FROM jsonb_array_elements(order_items) as item
  JOIN products p ON p.id = (item->>'id')::uuid
  WHERE p.is_active = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_product_price(product_id_param uuid, variant_id_param uuid DEFAULT NULL::uuid, customer_type_param text DEFAULT 'trade'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$function$;