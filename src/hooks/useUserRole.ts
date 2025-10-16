import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'driver' | 'customer' | 'account_customer';

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        setLoading(true); // Set loading immediately before fetching
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setRoles([]);
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
          setRoles([]);
        } else if (data && data.length > 0) {
          // Store all roles
          const userRoles = data.map(r => r.role as UserRole);
          setRoles(userRoles);
          
          // Determine effective role based on priority: admin > driver > account_customer > customer
          let effectiveRole: UserRole | null = null;
          if (userRoles.includes('admin')) {
            effectiveRole = 'admin';
          } else if (userRoles.includes('driver')) {
            effectiveRole = 'driver';
          } else if (userRoles.includes('account_customer')) {
            effectiveRole = 'account_customer';
          } else if (userRoles.includes('customer')) {
            effectiveRole = 'customer';
          }
          
          setRole(effectiveRole);
        } else {
          setRole(null);
          setRoles([]);
        }
      } catch (error) {
        console.error('Error in useUserRole:', error);
        setRole(null);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setLoading(true); // Set loading before re-fetching on auth change
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { 
    role, 
    roles,
    loading, 
    isAdmin: roles.includes('admin'), 
    isDriver: roles.includes('driver'), 
    isAccountCustomer: roles.includes('account_customer') 
  };
}
