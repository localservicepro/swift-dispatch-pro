
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

export function useCustomerDialogActions(
  formData: CustomerFormData,
  customer: Customer | null,
  isEdit: boolean,
  onSuccess: () => void,
  onClose: () => void
) {
  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast("Please fill in all required fields.", { description: "First name, last name, and email are required" });
      return;
    }

    const customerData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      full_address: formData.full_address,
      suburb_id: formData.suburb_id,
      customer_type: formData.customer_type,
      is_active: formData.is_active,
      sms_notifications_enabled: formData.sms_notifications_enabled,
    };

    try {
      if (isEdit && customer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(customerData);

        if (error) throw error;
      }

      onSuccess();
      onClose();
      toast("Customer saved successfully!", { description: `Customer ${isEdit ? 'updated' : 'created'} successfully` });
    } catch (error) {
      console.error("Error saving customer:", error);
      toast("Error saving customer", { description: "Please try again" });
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return {
    handleSave,
    handleCancel
  };
}
