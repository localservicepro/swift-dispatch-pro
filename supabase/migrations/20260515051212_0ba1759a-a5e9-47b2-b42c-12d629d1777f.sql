DROP FUNCTION IF EXISTS public.get_product_sales_by_customer(uuid[], timestamp with time zone, timestamp with time zone, text);

CREATE OR REPLACE FUNCTION public.get_product_sales_by_customer(p_product_ids uuid[], p_start timestamp with time zone, p_end timestamp with time zone, p_customer_type text DEFAULT NULL::text)
 RETURNS TABLE(customer_id uuid, customer_name text, business_name text, entity_type text, customer_type text, product_id uuid, product_name text, total_quantity numeric, total_amount numeric, order_count bigint, first_order timestamp with time zone, last_order timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can run this report';
  END IF;

  RETURN QUERY
  WITH items AS (
    SELECT
      o.id AS order_id,
      o.customer_id,
      o.customer_name,
      c.business_name AS business_name,
      c.entity_type::text AS entity_type,
      c.customer_type::text AS customer_type,
      o.created_at,
      (item->>'id')::uuid AS pid,
      COALESCE(item->>'name', 'Product') AS pname,
      COALESCE((item->>'quantity')::numeric, 0) AS qty,
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
      AND (p_customer_type IS NULL OR c.customer_type::text = p_customer_type)
  )
  SELECT
    i.customer_id,
    MAX(i.customer_name) AS customer_name,
    MAX(i.business_name) AS business_name,
    MAX(i.entity_type) AS entity_type,
    MAX(i.customer_type) AS customer_type,
    i.pid AS product_id,
    MAX(i.pname) AS product_name,
    SUM(i.qty) AS total_quantity,
    SUM(i.line_total) AS total_amount,
    COUNT(DISTINCT i.order_id) AS order_count,
    MIN(i.created_at) AS first_order,
    MAX(i.created_at) AS last_order
  FROM items i
  GROUP BY i.customer_id, i.pid;
END;
$function$;