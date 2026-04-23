import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerCompanyForm } from './CustomerCompanyForm';
import { CustomerContactForm } from './CustomerContactForm';
import { CustomerAddressForm } from './CustomerAddressForm';
import { CustomerPreferencesForm } from './CustomerPreferencesForm';
import { CustomerContactsManager } from './CustomerContactsManager';
import { CustomerOrders } from './CustomerOrders';
import { CustomerStats } from './CustomerStats';
import { CustomerCreditsManagement } from './CustomerCreditsManagement';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerDialogTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  formData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    full_address: string;
    delivery_address: string;
    suburb_id: string;
    customer_type: "residential" | "trade" | "account";
    entity_type: "individual" | "business";
    is_active: boolean;
    sms_notifications_enabled: boolean;
    stop_credit: boolean;
    company_name: string;
    business_name: string;
    contact_role: string;
  };
  deliveryRate: string;
  customer: Customer | null;
  isEdit: boolean;
  onCompanyChange: (updates: Partial<{ company_name: string; business_name: string; customer_type: "residential" | "trade" | "account"; entity_type: "individual" | "business" }>) => void;
  onContactChange: (updates: Partial<{ first_name: string; last_name: string; email: string; phone: string; contact_role: string }>) => void;
  onAddressFormChange: (updates: Partial<{ full_address: string; delivery_address: string; suburb_id: string }>) => void;
  onPreferencesChange: (updates: Partial<{ customer_type: "residential" | "trade" | "account"; entity_type: "individual" | "business"; is_active: boolean; sms_notifications_enabled: boolean; stop_credit: boolean }>) => void;
  onSuburbChange: (suburbId: string) => void;
  onContactsChange?: () => void;
}

export function CustomerDialogTabs({
  activeTab,
  setActiveTab,
  formData,
  deliveryRate,
  customer,
  isEdit,
  onCompanyChange,
  onContactChange,
  onAddressFormChange,
  onPreferencesChange,
  onSuburbChange,
  onContactsChange
}: CustomerDialogTabsProps) {
  const [primaryContactEmail, setPrimaryContactEmail] = useState<string | null>(null);
  const [primaryContactName, setPrimaryContactName] = useState<string | null>(null);

  useEffect(() => {
    if (customer && formData.customer_type === 'account') {
      loadPrimaryContact();
    }
  }, [customer?.id, formData.customer_type]);

  const loadPrimaryContact = async () => {
    if (!customer) return;

    const { data, error } = await supabase
      .from('customer_contacts')
      .select('first_name, last_name, email')
      .eq('customer_id', customer.id)
      .eq('is_primary_contact', true)
      .eq('is_active', true)
      .single();

    if (!error && data) {
      setPrimaryContactEmail(data.email);
      setPrimaryContactName(`${data.first_name} ${data.last_name}`.trim());
    } else {
      setPrimaryContactEmail(null);
      setPrimaryContactName(null);
    }
  };

  const handleAccessChange = () => {
    onContactsChange?.();
    loadPrimaryContact(); // Refresh primary contact info when portal access changes
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList>
        <TabsTrigger value="company">Company</TabsTrigger>
        <TabsTrigger value="contact">Contact</TabsTrigger>
        <TabsTrigger value="address">Address</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        {isEdit && customer && (
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        )}
        {isEdit && customer && (
          <>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </>
        )}
      </TabsList>
      
      <TabsContent value="company" className="space-y-4">
        <CustomerCompanyForm
          formData={{
            company_name: formData.company_name,
            business_name: formData.business_name,
            customer_type: formData.customer_type,
            entity_type: formData.entity_type,
            account_number: (formData as any).account_number,
          }}
          onFormDataChange={onCompanyChange}
          isEdit={isEdit}
        />
      </TabsContent>

      <TabsContent value="contact" className="space-y-4">
        <CustomerContactForm
          formData={{
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            contact_role: formData.contact_role,
          }}
          customerType={formData.customer_type}
          entityType={formData.entity_type}
          onFormDataChange={onContactChange}
        />
      </TabsContent>

      <TabsContent value="address" className="space-y-4">
        <CustomerAddressForm
          formData={{
            full_address: formData.full_address,
            delivery_address: formData.delivery_address,
            suburb_id: formData.suburb_id
          }}
          deliveryRate={deliveryRate}
          onFormDataChange={onAddressFormChange}
          onSuburbChange={onSuburbChange}
        />
      </TabsContent>

      <TabsContent value="preferences" className="space-y-4">
        <CustomerPreferencesForm
          formData={{
            customer_type: formData.customer_type,
            entity_type: formData.entity_type,
            is_active: formData.is_active,
            sms_notifications_enabled: formData.sms_notifications_enabled,
            stop_credit: formData.stop_credit,
          }}
          onFormDataChange={onPreferencesChange}
          customer={customer}
          primaryContactEmail={primaryContactEmail}
          primaryContactName={primaryContactName}
          onAccessChange={handleAccessChange}
        />
      </TabsContent>

      {isEdit && customer && (
        <TabsContent value="contacts">
          <CustomerContactsManager 
            customerId={customer.id}
            customerType={formData.customer_type}
            onContactChange={onContactsChange}
          />
        </TabsContent>
      )}

      {isEdit && customer && (
        <>
          <TabsContent value="orders">
            <CustomerOrders customer={customer} onBack={() => setActiveTab("company")} />
          </TabsContent>

          <TabsContent value="credits">
            <CustomerCreditsManagement customerId={customer.id} />
          </TabsContent>

          <TabsContent value="stats">
            <CustomerStats />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
