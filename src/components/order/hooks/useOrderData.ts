
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrderData() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers!inner (
            id,
            first_name,
            last_name,
            email,
            phone,
            company_name,
            business_name,
            customer_type,
            full_address,
            suburb_id,
            suburbs (
              name,
              state,
              postcode
            )
          ),
          delivery_suburbs:suburbs!delivery_suburb_id (
            name,
            state,
            postcode
          ),
          profiles!orders_driver_id_fkey (
            full_name
          ),
          trucks (
            registration_number,
            truck_type
          ),
          customer_contacts (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      // Transform the data to include all necessary fields including pickup details
      const transformedData = data?.map(order => ({
        ...order,
        customer_name: order.customers?.company_name || order.customers?.business_name || 
                      `${order.customers?.first_name || ''} ${order.customers?.last_name || ''}`.trim() || 
                      order.customer_name,
        company_name: order.customers?.company_name,
        business_name: order.customers?.business_name,
        customer_type: order.customers?.customer_type,
        driver_name: order.profiles?.full_name || 'Not Assigned',
        truck_registration: order.trucks?.registration_number,
        truck_type_from_truck: order.trucks?.truck_type,
        truck_type_display: order.trucks?.truck_type ? 
          order.trucks.truck_type.charAt(0).toUpperCase() + order.trucks.truck_type.slice(1) : 
          null,
        suburb_name: order.customers?.suburbs?.name,
        suburb_state: order.customers?.suburbs?.state,
        suburb_postcode: order.customers?.suburbs?.postcode,
        delivery_suburb_name: order.delivery_suburbs?.name,
        delivery_suburb_state: order.delivery_suburbs?.state,
        delivery_suburb_postcode: order.delivery_suburbs?.postcode,
        // Ensure pickup details are included
        pickup_location_address: order.pickup_location_address,
        pickup_location_name: order.pickup_location_name,
        pickup_contact_name: order.pickup_contact_name,
        pickup_contact_phone: order.pickup_contact_phone,
        pickup_instructions: order.pickup_instructions,
        pickup_date: order.pickup_date,
        pickup_time: order.pickup_time,
        delivery_method: order.delivery_method || 'delivery'
      }));

      console.log('Transformed orders data:', transformedData);
      return transformedData || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
