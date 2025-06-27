
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DatabaseHealthCheck {
  profiles: { success: boolean; count: number; error?: string };
  orders: { success: boolean; count: number; error?: string };
  customers: { success: boolean; count: number; error?: string };
  invoices: { success: boolean; count: number; error?: string };
  currentUser: { success: boolean; id?: string; role?: string; error?: string };
}

export function useDatabaseHealth() {
  const [healthCheck, setHealthCheck] = useState<DatabaseHealthCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runHealthCheck = async () => {
    setIsChecking(true);
    console.log('Starting database health check...');
    
    const results: DatabaseHealthCheck = {
      profiles: { success: false, count: 0 },
      orders: { success: false, count: 0 },
      customers: { success: false, count: 0 },
      invoices: { success: false, count: 0 },
      currentUser: { success: false }
    };

    // Check current user
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (user) {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        
        results.currentUser = {
          success: true,
          id: user.id,
          role: profile?.role || 'unknown',
          error: profileError?.message
        };
      } else {
        results.currentUser = { success: false, error: 'No authenticated user' };
      }
    } catch (error: any) {
      results.currentUser = { success: false, error: error.message };
    }

    // Check profiles table
    try {
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      results.profiles = { success: true, count: count || 0 };
    } catch (error: any) {
      results.profiles = { success: false, count: 0, error: error.message };
    }

    // Check orders table
    try {
      const { data, error, count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      results.orders = { success: true, count: count || 0 };
    } catch (error: any) {
      results.orders = { success: false, count: 0, error: error.message };
    }

    // Check customers table
    try {
      const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      results.customers = { success: true, count: count || 0 };
    } catch (error: any) {
      results.customers = { success: false, count: 0, error: error.message };
    }

    // Check invoices table
    try {
      const { data, error, count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      results.invoices = { success: true, count: count || 0 };
    } catch (error: any) {
      results.invoices = { success: false, count: 0, error: error.message };
    }

    console.log('Database health check results:', results);
    setHealthCheck(results);
    setIsChecking(false);
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return {
    healthCheck,
    isChecking,
    runHealthCheck
  };
}
