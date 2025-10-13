import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'driver' | 'customer' | 'account_customer';

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        // Fetch all roles for the user (they might have multiple)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else if (data && data.length > 0) {
          // Determine effective role based on priority: admin > driver > account_customer > customer
          const roles = data.map(r => r.role);
          
          let effectiveRole: UserRole | null = null;
          if (roles.includes('admin')) {
            effectiveRole = 'admin';
          } else if (roles.includes('driver')) {
            effectiveRole = 'driver';
          } else if (roles.includes('account_customer')) {
            effectiveRole = 'account_customer';
          } else if (roles.includes('customer')) {
            effectiveRole = 'customer';
          }
          
          setRole(effectiveRole);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Error in useUserRole:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { role, loading, isAdmin: role === 'admin', isDriver: role === 'driver', isAccountCustomer: role === 'account_customer' };
}
