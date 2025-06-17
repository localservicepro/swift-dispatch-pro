
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { emailService } from "@/utils/emailService";
import { useEffect } from "react";

export function useOrdersQuery() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      console.log('Fetching orders from database with enhanced suburb lookup...');
      
      // First, get all orders with their basic relationships
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          customer_address,
          products,
          total_amount,
          status,
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
          customers!orders_customer_id_fkey(
            id,
            suburb_id,
            suburbs(id, name, state, postcode)
          ),
          profiles!orders_driver_id_fkey(full_name),
          trucks!orders_truck_id_fkey(registration_number, truck_type)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      console.log('Raw orders data:', ordersData);

      // Now get all unique customer IDs that might be missing suburb data
      const customerIds = ordersData
        ?.filter(order => order.customer_id && (!order.customers?.suburbs || !order.customers.suburb_id))
        .map(order => order.customer_id)
        .filter(Boolean) as string[];

      // Fetch additional customer data for those missing suburb info
      let additionalCustomerData: any[] = [];
      if (customerIds.length > 0) {
        console.log('Fetching additional customer data for:', customerIds);
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select(`
            id,
            suburb_id,
            suburbs(id, name, state, postcode)
          `)
          .in('id', customerIds);

        if (!customerError) {
          additionalCustomerData = customerData || [];
          console.log('Additional customer data:', additionalCustomerData);
        }
      }

      // Map the data with enhanced suburb resolution
      const mappedOrders = ordersData?.map(order => {
        // Primary suburb source: from the main query
        let suburbData = order.customers?.suburbs;
        let suburbId = order.customers?.suburb_id;

        // Fallback: check additional customer data if primary is missing
        if (!suburbData && order.customer_id) {
          const additionalCustomer = additionalCustomerData.find(c => c.id === order.customer_id);
          if (additionalCustomer?.suburbs) {
            suburbData = additionalCustomer.suburbs;
            suburbId = additionalCustomer.suburb_id;
            console.log(`Found suburb data for order ${order.order_number} via fallback:`, suburbData);
          }
        }

        const mappedOrder = {
          ...order,
          suburb_id: suburbId || null,
          suburb_name: suburbData?.name || null,
          suburb_state: suburbData?.state || null,
          suburb_postcode: suburbData?.postcode || null,
          driver_name: order.profiles?.full_name || 'Not Assigned',
          truck_registration: order.trucks?.registration_number || null,
          truck_type_from_truck: order.trucks?.truck_type || order.truck_type
        };

        // Debug logging for orders without suburb data
        if (!suburbData && order.customer_id) {
          console.warn(`Order ${order.order_number} missing suburb data:`, {
            customer_id: order.customer_id,
            has_customer_relation: !!order.customers,
            customer_suburb_id: order.customers?.suburb_id,
            has_suburb_relation: !!order.customers?.suburbs
          });
        }

        return mappedOrder;
      }) || [];

      console.log('Final mapped orders:', mappedOrders);
      return mappedOrders;
    },
  });

  // Set up real-time subscription for order updates with email notifications
  useEffect(() => {
    console.log('Setting up real-time subscription for orders...');
    
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('Real-time order update received:', payload);
          
          // Invalidate and refetch orders when any change occurs
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          
          // Handle status updates with email notifications
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            
            if (oldStatus !== newStatus) {
              toast({
                title: "Order Status Updated",
                description: `Order ${payload.new.order_number} changed from ${oldStatus} to ${newStatus}`,
              });

              // Send email notification to customer
              try {
                // Get driver name if driver_id exists
                let driverName;
                if (payload.new.driver_id) {
                  const { data: driver } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', payload.new.driver_id)
                    .single();
                  driverName = driver?.full_name;
                }

                await emailService.sendOrderStatusUpdate(
                  payload.new.id,
                  oldStatus,
                  newStatus,
                  driverName
                );
              } catch (error) {
                console.error('Failed to send status update email:', error);
                // Don't show error toast to admin as email is background process
              }
            }
          }
          
          // Show toast for new orders
          if (payload.eventType === 'INSERT' && payload.new) {
            toast({
              title: "New Order Created",
              description: `Order ${payload.new.order_number} has been created`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return { orders, isLoading, error, refetch };
}
