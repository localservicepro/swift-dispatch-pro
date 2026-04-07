import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { formatOrderNumber } from "@/utils/orderNumberFormatter";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const PAGE_SIZE = 50;

// Helper function to extract initials from full name
const getInitials = (fullName: string | null | undefined): string => {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts.map(p => p.charAt(0).toUpperCase()).join("");
};

export interface Order {
  id: string;
  order_number: string;
  purchase_order?: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  delivery_address: string;
  products: any;
  products_formatted?: string;
  total_amount: number;
  status: OrderStatus;
  payment_status?: string;
  payment_date?: string;
  payment_method?: string;
  driver_id?: string;
  created_at: string;
  delivery_date?: string;
  delivery_time?: string;
  special_instructions?: string;
  customer_id?: string;
  suburb_id?: string;
  delivery_suburb_id?: string;
  delivery_fee?: number;
  subtotal?: number;
  adjustments?: number;
  order_notes?: string;
  delivery_notes?: string;
  driver_name?: string;
  truck_registration?: string;
  truck_type_display?: string;
  suburb_name?: string;
  suburb_state?: string;
  suburb_postcode?: string;
  delivery_suburb_name?: string;
  delivery_suburb_state?: string;
  delivery_suburb_postcode?: string;
  company_name?: string;
  business_name?: string;
  customer_type?: string;
  delivery_method?: string;
  delivered_at?: string;
  contact_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  admin_initials?: string;
}

interface OrderFilters {
  searchQuery?: string;
  statusFilter?: string;
  paymentStatusFilter?: string;
}

async function fetchMatchingCustomerIds(searchTerm: string): Promise<string[]> {
  const { data } = await supabase
    .from('customers')
    .select('id')
    .or(
      `company_name.ilike.%${searchTerm}%,business_name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`
    )
    .limit(200);
  return data?.map(c => c.id) || [];
}

async function fetchOrdersPage(pageParam: number, filters: OrderFilters) {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      purchase_order,
      customer_name,
      customer_phone,
      customer_address,
      delivery_address,
      products,
      products_formatted,
      total_amount,
      status,
      payment_status,
      payment_date,
      payment_method,
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
      order_notes,
      delivery_notes,
      driver_name,
      truck_registration,
      truck_type_display,
      delivery_suburb_id,
      delivery_method,
      deleted_at,
      contact_id,
      contact_name,
      contact_email,
      contact_phone,
      admin_id,
      customers!orders_customer_id_fkey(
        id,
        suburb_id,
        company_name,
        business_name,
        customer_type,
        suburbs(id, name, state, postcode)
      ),
      delivery_suburbs:suburbs!orders_delivery_suburb_id_fkey(
        id, name, state, postcode
      ),
      delivered_status:delivery_status_updates!delivery_status_updates_order_id_fkey(
        created_at
      ),
      admin_profile:profiles!orders_admin_id_fkey(
        full_name
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Apply server-side status filter
  if (filters.statusFilter && filters.statusFilter !== 'all') {
    query = query.eq('status', filters.statusFilter as OrderStatus);
  }

  // Apply server-side payment status filter
  if (filters.paymentStatusFilter && filters.paymentStatusFilter !== 'all') {
    query = query.eq('payment_status', filters.paymentStatusFilter);
  }

  // Apply server-side search filter — also searches customer company/business names
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.trim();

    // Pre-search customers table for company_name / business_name matches
    const matchedCustomerIds = await fetchMatchingCustomerIds(q);

    let orFilter = `order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,purchase_order.ilike.%${q}%,contact_phone.ilike.%${q}%,contact_name.ilike.%${q}%,delivery_address.ilike.%${q}%`;

    if (matchedCustomerIds.length > 0) {
      orFilter += `,customer_id.in.(${matchedCustomerIds.join(',')})`;
    }

    query = query.or(orFilter);
  }

  query = query.range(from, to);

  const { data: ordersData, error: ordersError } = await query;

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    throw ordersError;
  }

  const mappedOrders = ordersData?.map(order => {
    const customerSuburbData = order.customers?.suburbs;
    const customerSuburbId = order.customers?.suburb_id;
    const deliverySuburbData = order.delivery_suburbs;

    const deliveredAt = order.status === 'delivered' && order.delivered_status?.length > 0
      ? order.delivered_status[order.delivered_status.length - 1].created_at
      : null;

    const adminInitials = getInitials(order.admin_profile?.full_name);

    return {
      ...order,
      suburb_id: customerSuburbId || null,
      suburb_name: customerSuburbData?.name || null,
      suburb_state: customerSuburbData?.state || null,
      suburb_postcode: customerSuburbData?.postcode || null,
      delivery_suburb_id: order.delivery_suburb_id || null,
      delivery_suburb_name: deliverySuburbData?.name || null,
      delivery_suburb_state: deliverySuburbData?.state || null,
      delivery_suburb_postcode: deliverySuburbData?.postcode || null,
      company_name: order.customers?.company_name || null,
      business_name: order.customers?.business_name || null,
      customer_type: order.customers?.customer_type || null,
      driver_name: order.driver_name || 'Not Assigned',
      truck_registration: order.truck_registration || null,
      truck_type_display: order.truck_type_display || null,
      delivered_at: deliveredAt,
      admin_initials: adminInitials
    };
  }) || [];

  return mappedOrders;
}

export function useOrderData(filters: OrderFilters = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['orders', filters.searchQuery || '', filters.statusFilter || 'all', filters.paymentStatusFilter || 'all'],
    queryFn: ({ pageParam }) => fetchOrdersPage(pageParam, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length === PAGE_SIZE) {
        return lastPageParam + 1;
      }
      return undefined;
    },
  });

  // Flatten all pages into a single array
  const orders = useMemo(() => {
    return data?.pages.flat() || [];
  }, [data]);

  return { orders, isLoading, error, refetch, fetchNextPage, hasNextPage: !!hasNextPage, isFetchingNextPage };
}

// Keep for backward compat but now it's a no-op pass-through since filtering is server-side
export function useFilteredOrders(orders: Order[], _searchQuery: string, _statusFilter: string, _paymentStatusFilter?: string) {
  return orders;
}
