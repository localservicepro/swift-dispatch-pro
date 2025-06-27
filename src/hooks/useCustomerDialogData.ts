
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  full_address: string;
  suburb_id: string;
  customer_type: "trade" | "account";
  is_active: boolean;
  sms_notifications_enabled: boolean;
}

export function useCustomerDialogData(customer: Customer | null) {
  const [formData, setFormData] = useState<CustomerFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    full_address: '',
    suburb_id: '',
    customer_type: 'trade',
    is_active: true,
    sms_notifications_enabled: true,
  });
  const [deliveryRate, setDeliveryRate] = useState<string>('');

  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        full_address: customer.full_address || '',
        suburb_id: customer.suburb_id || '',
        customer_type: customer.customer_type as "trade" | "account",
        is_active: customer.is_active,
        sms_notifications_enabled: customer.sms_notifications_enabled,
      });
      
      // Fetch delivery rate when customer or suburb changes
      const fetchDeliveryRate = async () => {
        if (customer.suburb_id) {
          const { data, error } = await supabase
            .from('suburbs')
            .select('delivery_rate')
            .eq('id', customer.suburb_id)
            .single();

          if (error) {
            console.error("Error fetching suburb:", error);
            toast("Error fetching suburb", { description: "Failed to load delivery rate" });
          } else if (data) {
            setDeliveryRate(data.delivery_rate);
          }
        }
      };

      fetchDeliveryRate();
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        full_address: '',
        suburb_id: '',
        customer_type: 'trade',
        is_active: true,
        sms_notifications_enabled: true,
      });
      setDeliveryRate('');
    }
  }, [customer]);

  const handlePersonalInfoChange = (updates: Partial<{ first_name: string; last_name: string; email: string; phone: string }>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleAddressFormChange = (updates: Partial<{ full_address: string; suburb_id: string }>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handlePreferencesChange = (updates: Partial<{ customer_type: "trade" | "account"; is_active: boolean; sms_notifications_enabled: boolean }>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSuburbChange = (suburbId: string) => {
    setFormData(prev => ({ ...prev, suburb_id: suburbId }));
    // Note: We no longer automatically set delivery rate - it's for reference only
    setDeliveryRate('');
  };

  return {
    formData,
    deliveryRate,
    handlePersonalInfoChange,
    handleAddressFormChange,
    handlePreferencesChange,
    handleSuburbChange
  };
}
