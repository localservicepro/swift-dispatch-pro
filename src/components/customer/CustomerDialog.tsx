
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerPersonalInfoForm } from './CustomerPersonalInfoForm';
import { CustomerAddressForm } from './CustomerAddressForm';
import { CustomerPreferencesForm } from './CustomerPreferencesForm';
import { CustomerOrders } from './CustomerOrders';
import { CustomerStats } from './CustomerStats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isEdit?: boolean;
}

export function CustomerDialog({ customer, isOpen, onClose, onSuccess, isEdit = false }: CustomerDialogProps) {
  const [formData, setFormData] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    full_address: string;
    suburb_id: string;
    customer_type: "trade" | "account";
    is_active: boolean;
    sms_notifications_enabled: boolean;
  }>({
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
  const [activeTab, setActiveTab] = useState("personal");
  const [deliveryRate, setDeliveryRate] = useState(0);

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
      setDeliveryRate(0);
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

  const handleSuburbChange = (suburbId: string, rate: number) => {
    setFormData(prev => ({ ...prev, suburb_id: suburbId }));
    setDeliveryRate(rate);
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast("Please fill in all required fields.", { description: "First name, last name, and email are required" });
      return;
    }

    const customerData: Partial<Customer> = {
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
          .insert([customerData]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "Create Customer"}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            {isEdit && customer && (
              <>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
              </>
            )}
          </TabsList>
          
          <TabsContent value="personal" className="space-y-4">
            <CustomerPersonalInfoForm
              formData={{
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                phone: formData.phone,
              }}
              onFormDataChange={handlePersonalInfoChange}
            />
          </TabsContent>

          <TabsContent value="address" className="space-y-4">
            <CustomerAddressForm
              formData={{
                full_address: formData.full_address,
                suburb_id: formData.suburb_id
              }}
              deliveryRate={deliveryRate}
              onFormDataChange={handleAddressFormChange}
              onSuburbChange={handleSuburbChange}
            />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <CustomerPreferencesForm
              formData={{
                customer_type: formData.customer_type,
                is_active: formData.is_active,
                sms_notifications_enabled: formData.sms_notifications_enabled,
              }}
              onFormDataChange={handlePreferencesChange}
            />
          </TabsContent>

          {isEdit && customer && (
            <>
              <TabsContent value="orders">
                <CustomerOrders customer={customer} onBack={() => setActiveTab("personal")} />
              </TabsContent>

              <TabsContent value="stats">
                <CustomerStats customers={[customer]} />
              </TabsContent>
            </>
          )}

          <div className="flex justify-end space-x-2 mt-6">
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
