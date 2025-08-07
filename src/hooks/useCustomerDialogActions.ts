
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  full_address: string;
  suburb_id: string;
  customer_type: 'residential' | 'trade' | 'account';
  entity_type: 'individual' | 'business';
  is_active: boolean;
  sms_notifications_enabled: boolean;
  stop_credit: boolean;
  company_name: string;
  business_name: string;
  contact_role: string;
}

export function useCustomerDialogActions(
  formData: FormData,
  customer: Customer | null,
  isEdit: boolean,
  onSuccess: () => void,
  onClose: () => void
) {
  const { toast } = useToast();

  const handleSave = async () => {
    // Check if this is an Account Business entity
    const isAccountBusiness = formData.customer_type === 'account' && formData.entity_type === 'business';
    
    // Validation for Account Business entities
    if (isAccountBusiness) {
      if (!formData.company_name || !formData.full_address || !formData.suburb_id) {
        toast({
          title: "Error",
          description: "Company name, address, and suburb are required for business accounts",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Standard validation for all other customer types
      if (!formData.first_name || !formData.last_name || !formData.email) {
        toast({
          title: "Error",
          description: "First name, last name, and email are required",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.entity_type === 'business' && !formData.company_name) {
        toast({
          title: "Error",
          description: "Company name is required for business entities",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const customerData = {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        full_address: formData.full_address,
        suburb_id: formData.suburb_id || null,
        customer_type: formData.customer_type,
        entity_type: formData.entity_type,
        is_active: formData.is_active,
        sms_notifications_enabled: formData.sms_notifications_enabled,
        stop_credit: formData.stop_credit,
        company_name: formData.entity_type === 'business' ? formData.company_name : null,
        business_name: formData.entity_type === 'business' ? formData.business_name : null,
        contact_role: formData.contact_role,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && customer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Customer updated successfully!",
        });
      } else {
        // Create new customer
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert([{ ...customerData, created_at: new Date().toISOString() }])
          .select()
          .single();

        if (error) throw error;

        // For business customers with contact details, create primary contact record
        if (formData.entity_type === 'business' && newCustomer && formData.first_name && formData.last_name) {
          const { error: contactError } = await supabase
            .from('customer_contacts')
            .insert([{
              customer_id: newCustomer.id,
              first_name: formData.first_name,
              last_name: formData.last_name,
              email: formData.email || null,
              phone: formData.phone || null,
              contact_role: formData.contact_role,
              is_primary_contact: true,
            }]);

          if (contactError) {
            console.error('Error creating primary contact:', contactError);
            // Don't fail the entire operation for this
          }
        }

        toast({
          title: "Success",
          description: "Customer created successfully!",
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save customer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return {
    handleSave,
    handleCancel,
  };
}
