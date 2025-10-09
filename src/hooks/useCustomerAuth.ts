import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCustomerAuth() {
  const { user } = useAuth();

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['customer-auth', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check if user has account_customer role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, customer_id')
        .eq('user_id', user.id)
        .eq('role', 'account_customer')
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData) return null;

      // Fetch customer details
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*, customer_stores(*)')
        .eq('id', roleData.customer_id)
        .single();

      if (customerError) throw customerError;

      return {
        customerId: customer.id,
        customerName: customer.company_name || `${customer.first_name} ${customer.last_name}`,
        customer,
        hasPortalAccess: customer.portal_access_enabled || false,
        storeEnabled: customer.store_enabled || false,
        storeSlug: customer.customer_stores?.[0]?.slug,
      };
    },
    enabled: !!user?.id,
  });

  return {
    user,
    isCustomer: !!customerData,
    customerId: customerData?.customerId,
    customerName: customerData?.customerName,
    customer: customerData?.customer,
    hasPortalAccess: customerData?.hasPortalAccess || false,
    storeEnabled: customerData?.storeEnabled || false,
    storeSlug: customerData?.storeSlug,
    isLoading,
  };
}
