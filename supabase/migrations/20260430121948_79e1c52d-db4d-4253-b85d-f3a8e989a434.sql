CREATE OR REPLACE FUNCTION public.get_active_specials_for_products(
  product_ids_param uuid[],
  customer_tier_param text DEFAULT 'trade'
)
RETURNS TABLE(
  product_id uuid,
  special_id uuid,
  special_name text,
  discount_type discount_type,
  discount_value numeric,
  end_date timestamp with time zone
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (p.id)
    p.id AS product_id,
    ps.id AS special_id,
    ps.name AS special_name,
    ps.discount_type,
    ps.discount_value,
    ps.end_date
  FROM public.products p
  JOIN public.product_special_items psi
    ON psi.product_id = p.id OR psi.category_id = p.category_id
  JOIN public.product_specials ps
    ON ps.id = psi.special_id
  WHERE p.id = ANY(product_ids_param)
    AND ps.is_active = true
    AND ps.start_date <= now()
    AND ps.end_date >= now()
    AND customer_tier_param = ANY(ps.customer_tiers)
  ORDER BY p.id, ps.discount_value DESC;
$$;