import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
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
}

export function useOrderData() {
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      console.log('Fetching orders from database with delivery suburb information...');

      const { data: ordersData, error: ordersError } = await supabase
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
          driver_id,
          created_at,
          delivery_date,
          delivery_time,
          special_instructions,
          customer_id,
          delivery_fee,
          subtotal,
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
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      console.log('Raw orders data:', ordersData);

      const mappedOrders = ordersData?.map(order => {
        const customerSuburbData = order.customers?.suburbs;
        const customerSuburbId = order.customers?.suburb_id;
        const deliverySuburbData = order.delivery_suburbs;
        
        // Find the most recent delivery completion timestamp
        const deliveredAt = order.status === 'delivered' && order.delivered_status?.length > 0 
          ? order.delivered_status[order.delivered_status.length - 1].created_at 
          : null;

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
          delivered_at: deliveredAt
        };
      }) || [];

      console.log('Final mapped orders with delivery suburb information:', mappedOrders);
      return mappedOrders;
    }
  });

  return { orders, isLoading, error, refetch };
}

export function useFilteredOrders(orders: Order[], searchQuery: string, statusFilter: string, paymentStatusFilter?: string) {
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        (order.customer_phone && order.customer_phone.toLowerCase().includes(query)) ||
        (order.purchase_order && order.purchase_order.toLowerCase().includes(query)) ||
        (order.company_name && order.company_name.toLowerCase().includes(query)) ||
        (order.business_name && order.business_name.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply payment status filter
    if (paymentStatusFilter && paymentStatusFilter !== "all") {
      filtered = filtered.filter(order => order.payment_status === paymentStatusFilter);
    }

    return filtered;
  }, [orders, searchQuery, statusFilter, paymentStatusFilter]);

  return filteredOrders;
}
