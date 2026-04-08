
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

export function useCustomerDialogData(customer: Customer | null) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    full_address: '',
    delivery_address: '',
    suburb_id: '',
    customer_type: 'residential' as 'residential' | 'trade' | 'account',
    entity_type: 'individual' as 'individual' | 'business',
    is_active: true,
    sms_notifications_enabled: true,
    stop_credit: false,
    company_name: '',
    business_name: '',
    contact_role: 'Primary Contact',
    account_number: '',
  });
  
  const [deliveryRate, setDeliveryRate] = useState<string>('');

  useEffect(() => {
    if (customer) {
      const deliveryAddress = (customer as any).delivery_address || '';
      const fullAddress = customer.full_address || '';
      
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        full_address: fullAddress,
        delivery_address: deliveryAddress || fullAddress, // Auto-populate if empty
        suburb_id: customer.suburb_id || '',
        customer_type: (customer.customer_type as 'residential' | 'trade' | 'account') || 'residential',
        entity_type: (customer.entity_type as 'individual' | 'business') || 'individual',
        is_active: customer.is_active ?? true,
        sms_notifications_enabled: customer.sms_notifications_enabled ?? true,
        stop_credit: (customer as any).stop_credit ?? false,
        company_name: customer.company_name || '',
        business_name: customer.business_name || '',
        contact_role: customer.contact_role || getDefaultContactRole(customer.customer_type as any, customer.entity_type as any),
      });

      // Load delivery rate if suburb_id exists
      if (customer.suburb_id) {
        loadDeliveryRate(customer.suburb_id);
      }
    } else {
      // Reset form for new customer
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        full_address: '',
        delivery_address: '',
        suburb_id: '',
        customer_type: 'residential',
        entity_type: 'individual',
        is_active: true,
        sms_notifications_enabled: true,
        stop_credit: false,
        company_name: '',
        business_name: '',
        contact_role: 'Owner',
      });
    }
  }, [customer]);

  const getDefaultContactRole = (customerType: 'residential' | 'trade' | 'account', entityType: 'individual' | 'business') => {
    if (entityType === 'business') {
      return 'Primary Contact';
    }
    if (customerType === 'residential') {
      return 'Owner';
    }
    if (customerType === 'trade') {
      return 'Tradesperson';
    }
    return 'Contact';
  };

  const loadDeliveryRate = async (suburbId: string) => {
    const { data, error } = await supabase
      .from('suburbs')
      .select('delivery_rate')
      .eq('id', suburbId)
      .single();

    if (!error && data) {
      setDeliveryRate(data.delivery_rate);
    }
  };

  const handleCompanyChange = (updates: Partial<{ company_name: string; business_name: string; customer_type: 'residential' | 'trade' | 'account'; entity_type: 'individual' | 'business' }>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // Update contact role based on customer type and entity type
      if (updates.customer_type || updates.entity_type) {
        newData.contact_role = getDefaultContactRole(
          updates.customer_type || prev.customer_type,
          updates.entity_type || prev.entity_type
        );
      }
      
      return newData;
    });
  };

  const handleContactChange = (updates: Partial<{ first_name: string; last_name: string; email: string; phone: string; contact_role: string }>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleAddressFormChange = (updates: Partial<{ full_address: string; delivery_address: string; suburb_id: string }>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // Auto-populate delivery address when office address changes (for new customers or when they match)
      if (updates.full_address !== undefined) {
        if (!prev.delivery_address || prev.delivery_address === prev.full_address) {
          newData.delivery_address = updates.full_address;
        }
      }
      
      return newData;
    });
    
    if (updates.suburb_id) {
      loadDeliveryRate(updates.suburb_id);
    }
  };

  const handlePreferencesChange = (updates: Partial<{ customer_type: 'residential' | 'trade' | 'account'; entity_type: 'individual' | 'business'; is_active: boolean; sms_notifications_enabled: boolean; stop_credit: boolean }>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // Update contact role based on customer type and entity type
      if (updates.customer_type || updates.entity_type) {
        newData.contact_role = getDefaultContactRole(
          updates.customer_type || prev.customer_type,
          updates.entity_type || prev.entity_type
        );
      }
      
      return newData;
    });
  };

  const handleSuburbChange = (suburbId: string) => {
    setFormData(prev => ({ ...prev, suburb_id: suburbId }));
    loadDeliveryRate(suburbId);
  };

  return {
    formData,
    deliveryRate,
    handleCompanyChange,
    handleContactChange,
    handleAddressFormChange,
    handlePreferencesChange,
    handleSuburbChange
  };
}
