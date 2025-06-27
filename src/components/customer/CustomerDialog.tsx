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
  onSave: (customerData: Partial<Customer>) => void;
  isEdit?: boolean;
}

export function CustomerDialog({ customer, isOpen, onClose, onSave, isEdit = false }: CustomerDialogProps) {
  const [formData, setFormData] = useState<{
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    full_address: string | null;
    suburb_id: string | null;
    notes: string | null;
    preferences: any;
  }>({
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    full_address: null,
    suburb_id: null,
    notes: null,
    preferences: null,
  });
  const [activeTab, setActiveTab] = useState("personal");
  const [deliveryRate, setDeliveryRate] = useState(0);

  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        full_address: customer.full_address,
        suburb_id: customer.suburb_id,
        notes: customer.notes,
        preferences: customer.preferences,
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
            toast("Error fetching suburb", { type: "error" });
          } else if (data) {
            setDeliveryRate(data.delivery_rate);
          }
        }
      };

      fetchDeliveryRate();
    } else {
      setFormData({
        first_name: null,
        last_name: null,
        email: null,
        phone: null,
        full_address: null,
        suburb_id: null,
        notes: null,
        preferences: null,
      });
      setDeliveryRate(0);
    }
  }, [customer]);

  const handleAddressFormChange = (updates: Partial<{ full_address: string; suburb_id: string }>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSuburbChange = (suburbId: string, rate: number) => {
    setFormData(prev => ({ ...prev, suburb_id: suburbId }));
    setDeliveryRate(rate);
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast("Please fill in all required fields.", { type: "error" });
      return;
    }

    const customerData: Partial<Customer> = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      full_address: formData.full_address,
      suburb_id: formData.suburb_id,
      notes: formData.notes,
      preferences: formData.preferences,
    };

    try {
      onSave(customerData);
      onClose();
      toast("Customer saved successfully!", { type: "success" });
    } catch (error) {
      console.error("Error saving customer:", error);
      toast("Error saving customer", { type: "error" });
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
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal" className="space-y-4">
            <CustomerPersonalInfoForm
              formData={formData}
              onFormDataChange={setFormData}
            />
          </TabsContent>

          <TabsContent value="address" className="space-y-4">
            <CustomerAddressForm
              formData={{
                full_address: formData.full_address || '',
                suburb_id: formData.suburb_id || ''
              }}
              deliveryRate={deliveryRate}
              onFormDataChange={handleAddressFormChange}
              onSuburbChange={handleSuburbChange}
            />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <CustomerPreferencesForm
              formData={formData}
              onFormDataChange={setFormData}
            />
          </TabsContent>

          <TabsContent value="orders">
            <CustomerOrders customerId={customer?.id} />
          </TabsContent>

          <TabsContent value="stats">
            <CustomerStats customerId={customer?.id} />
          </TabsContent>

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
