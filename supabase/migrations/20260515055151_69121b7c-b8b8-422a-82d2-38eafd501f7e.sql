CREATE OR REPLACE FUNCTION public.get_product_orders_by_customer(
  p_product_ids uuid[],
  p_start timestamp with time zone,
  p_end timestamp with time zone,
  p_customer_type text DEFAULT NULL
)
RETURNS TABLE(
  customer_id uuid,
  customer_name text,
  business_name text,
  entity_type text,
  customer_type text,
  order_id uuid,
  order_number text,
  order_date timestamp with time zone,
  product_id uuid,
  product_name text,
  quantity numeric,
  line_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can run this report';
  END IF;

  RETURN QUERY
  SELECT
    o.customer_id,
    o.customer_name,
    c.business_name AS business_name,
    c.entity_type::text AS entity_type,
    c.customer_type::text AS customer_type,
    o.id AS order_id,
    o.order_number,
    o.created_at AS order_date,
    (item->>'id')::uuid AS product_id,
    COALESCE(item->>'name', 'Product') AS product_name,
    COALESCE((item->>'quantity')::numeric, 0) AS quantity,
    COALESCE(
      (item->>'total_price')::numeric,
      COALESCE((item->>'unit_price')::numeric, (item->>'price')::numeric, 0)
        * COALESCE((item->>'quantity')::numeric, 0)
    ) AS line_total
  FROM public.orders o
  LEFT JOIN public.customers c ON c.id = o.customer_id
  CROSS JOIN LATERAL jsonb_array_elements(o.products) AS item
  WHERE o.deleted_at IS NULL
    AND o.created_at >= p_start
    AND o.created_at < p_end
    AND (item->>'id')::uuid = ANY(p_product_ids)
    AND (p_customer_type IS NULL OR c.customer_type::text = p_customer_type);
END;
$function$;