
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerCompanyForm } from './CustomerCompanyForm';
import { CustomerContactForm } from './CustomerContactForm';
import { CustomerAddressForm } from './CustomerAddressForm';
import { CustomerPreferencesForm } from './CustomerPreferencesForm';
import { CustomerContactsManager } from './CustomerContactsManager';
import { CustomerOrders } from './CustomerOrders';
import { CustomerStats } from './CustomerStats';
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
    suburb_id: string;
    customer_type: "trade" | "account";
    is_active: boolean;
    sms_notifications_enabled: boolean;
    company_name: string;
    business_name: string;
    contact_role: string;
  };
  deliveryRate: string;
  customer: Customer | null;
  isEdit: boolean;
  onCompanyChange: (updates: Partial<{ company_name: string; business_name: string; customer_type: "trade" | "account" }>) => void;
  onContactChange: (updates: Partial<{ first_name: string; last_name: string; email: string; phone: string; contact_role: string }>) => void;
  onAddressFormChange: (updates: Partial<{ full_address: string; suburb_id: string }>) => void;
  onPreferencesChange: (updates: Partial<{ customer_type: "trade" | "account"; is_active: boolean; sms_notifications_enabled: boolean }>) => void;
  onSuburbChange: (suburbId: string) => void;
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
  onSuburbChange
}: CustomerDialogTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList>
        <TabsTrigger value="company">Company</TabsTrigger>
        <TabsTrigger value="contact">Contact</TabsTrigger>
        <TabsTrigger value="address">Address</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        {isEdit && customer && formData.customer_type === 'account' && (
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        )}
        {isEdit && customer && (
          <>
            <TabsTrigger value="orders">Orders</TabsTrigger>
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
          }}
          onFormDataChange={onCompanyChange}
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
          onFormDataChange={onContactChange}
        />
      </TabsContent>

      <TabsContent value="address" className="space-y-4">
        <CustomerAddressForm
          formData={{
            full_address: formData.full_address,
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
            is_active: formData.is_active,
            sms_notifications_enabled: formData.sms_notifications_enabled,
          }}
          onFormDataChange={onPreferencesChange}
        />
      </TabsContent>

      {isEdit && customer && formData.customer_type === 'account' && (
        <TabsContent value="contacts">
          <CustomerContactsManager 
            customerId={customer.id}
            customerType={formData.customer_type}
          />
        </TabsContent>
      )}

      {isEdit && customer && (
        <>
          <TabsContent value="orders">
            <CustomerOrders customer={customer} onBack={() => setActiveTab("company")} />
          </TabsContent>

          <TabsContent value="stats">
            <CustomerStats customers={[customer]} />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
