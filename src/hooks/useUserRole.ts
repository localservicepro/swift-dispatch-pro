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

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole(data?.role as UserRole);
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
