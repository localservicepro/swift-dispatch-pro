
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CustomerDialogTabs } from './CustomerDialogTabs';
import { CustomerDialogActions } from './CustomerDialogActions';
import { useCustomerDialogData } from '@/hooks/useCustomerDialogData';
import { useCustomerDialogActions } from '@/hooks/useCustomerDialogActions';
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
  const [activeTab, setActiveTab] = useState("company");
  
  const {
    formData,
    deliveryRate,
    handleCompanyChange,
    handleContactChange,
    handleAddressFormChange,
    handlePreferencesChange,
    handleSuburbChange
  } = useCustomerDialogData(customer);

  const {
    handleSave,
    handleCancel
  } = useCustomerDialogActions(formData, customer, isEdit, onSuccess, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "Create Customer"}</DialogTitle>
        </DialogHeader>
        
        <CustomerDialogTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          formData={formData}
          deliveryRate={deliveryRate}
          customer={customer}
          isEdit={isEdit}
          onCompanyChange={handleCompanyChange}
          onContactChange={handleContactChange}
          onAddressFormChange={handleAddressFormChange}
          onPreferencesChange={handlePreferencesChange}
          onSuburbChange={handleSuburbChange}
        />

        <CustomerDialogActions
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
