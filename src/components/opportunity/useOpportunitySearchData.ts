import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { isPhoneNumber, getPhoneSearchVariants } from "@/utils/phoneUtils";

const SEARCH_LIMIT = 200;

const PIPELINE_SELECT = `
  id,
  order_number,
  purchase_order,
  customer_name,
  customer_phone,
  customer_address,
  delivery_address,
  products,
  total_amount,
  status,
  payment_status,
  driver_id,
  created_at,
  delivery_date,
  delivery_time,
  special_instructions,
  customer_id,
  delivery_fee,
  subtotal,
  adjustments,
  truck_type,
  truck_id,
  deleted_at,
  master_order_id,
  is_split_order,
  delivery_suburb_id,
  delivery_method,
  order_notes,
  delivery_notes,
  contact_id,
  contact_name,
  contact_email,
  contact_phone,
  customers!orders_customer_id_fkey(
    id,
    suburb_id,
    company_name,
    business_name,
    customer_type,
    suburbs(id, name, state, postcode)
  ),
  delivery_suburbs:suburbs!orders_delivery_suburb_id_fkey(id, name, state, postcode),
  profiles!orders_driver_id_fkey(full_name),
  trucks!orders_truck_id_fkey(registration_number, truck_type)
`;

function mapOrder(order: any) {
  return {
    ...order,
    suburb_id: order.customers?.suburb_id || null,
    suburb_name: order.customers?.suburbs?.name || null,
    suburb_state: order.customers?.suburbs?.state || null,
    suburb_postcode: order.customers?.suburbs?.postcode || null,
    delivery_suburb_id: order.delivery_suburb_id || null,
    delivery_suburb_name: order.delivery_suburbs?.name || null,
    delivery_suburb_state: order.delivery_suburbs?.state || null,
    delivery_suburb_postcode: order.delivery_suburbs?.postcode || null,
    company_name: order.customers?.company_name || null,
    business_name: order.customers?.business_name || null,
    customer_type: order.customers?.customer_type || null,
    driver_name: order.profiles?.full_name || "Not Assigned",
    truck_registration: order.trucks?.registration_number || null,
    truck_type_from_truck: order.trucks?.truck_type || order.truck_type,
    delivered_at: null as string | null,
  };
}

async function fetchMatchingCustomerIds(q: string, phoneVariants: string[]): Promise<string[]> {
  const orParts: string[] = [
    `company_name.ilike.%${q}%`,
    `business_name.ilike.%${q}%`,
    `first_name.ilike.%${q}%`,
    `last_name.ilike.%${q}%`,
  ];
  for (const v of phoneVariants) {
    orParts.push(`phone.ilike.%${v}%`);
  }
  const { data } = await supabase
    .from("customers")
    .select("id")
    .or(orParts.join(","))
    .limit(200);
  return data?.map((c) => c.id) || [];
}

/**
 * Server-side search for the Opportunities pipeline.
 * Scans the entire orders table (not just the recent active window),
 * so historical orders for long-time customers can be surfaced.
 */
export function useOpportunitySearchData(searchQuery: string) {
  const debouncedQuery = useDebounce(searchQuery, 300);
  const trimmed = debouncedQuery.trim();
  const enabled = trimmed.length > 0;

  return useQuery({
    queryKey: ["opportunity-search", trimmed],
    enabled,
    queryFn: async () => {
      const q = trimmed;
      const isPhone = isPhoneNumber(q);
      const phoneVariants = isPhone ? getPhoneSearchVariants(q) : [];

      const customerIds = await fetchMatchingCustomerIds(q, phoneVariants);

      const orParts: string[] = [
        `order_number.ilike.%${q}%`,
        `customer_name.ilike.%${q}%`,
        `purchase_order.ilike.%${q}%`,
        `contact_name.ilike.%${q}%`,
        `delivery_address.ilike.%${q}%`,
      ];

      if (isPhone && phoneVariants.length > 0) {
        for (const v of phoneVariants) {
          orParts.push(`customer_phone.ilike.%${v}%`);
          orParts.push(`contact_phone.ilike.%${v}%`);
        }
      } else {
        orParts.push(`customer_phone.ilike.%${q}%`);
        orParts.push(`contact_phone.ilike.%${q}%`);
      }

      if (customerIds.length > 0) {
        orParts.push(`customer_id.in.(${customerIds.join(",")})`);
      }

      const { data, error } = await supabase
        .from("orders")
        .select(PIPELINE_SELECT)
        .is("deleted_at", null)
        .or(orParts.join(","))
        .order("created_at", { ascending: false })
        .limit(SEARCH_LIMIT);

      if (error) throw error;
      return (data || []).map(mapOrder);
    },
    staleTime: 30_000,
  });
}
