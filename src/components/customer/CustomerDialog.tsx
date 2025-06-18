
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CustomerPersonalInfoForm } from "./CustomerPersonalInfoForm";
import { CustomerAddressForm } from "./CustomerAddressForm";
import { CustomerPreferencesForm } from "./CustomerPreferencesForm";

interface CustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: any;
  isEditMode: boolean;
  onSuccess: () => void;
}

export function CustomerDialog({ isOpen, onClose, customer, isEditMode, onSuccess }: CustomerDialogProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    full_address: "",
    customer_type: "trade" as "trade" | "account",
    is_active: true,
    sms_notifications_enabled: true,
    suburb_id: "",
  });
  const [deliveryRate, setDeliveryRate] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customer && isEditMode) {
      setFormData({
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        full_address: customer.full_address || "",
        customer_type: customer.customer_type || "trade",
        is_active: customer.is_active ?? true,
        sms_notifications_enabled: customer.sms_notifications_enabled ?? true,
        suburb_id: customer.suburb_id || "",
      });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        full_address: "",
        customer_type: "trade",
        is_active: true,
        sms_notifications_enabled: true,
        suburb_id: "",
      });
      setDeliveryRate(0);
    }
  }, [customer, isEditMode, isOpen]);

  const handleFormDataChange = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSuburbChange = (suburbId: string, rate: number) => {
    setFormData(prev => ({ ...prev, suburb_id: suburbId }));
    setDeliveryRate(rate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isEditMode && customer) {
        const { error } = await supabase
          .from("customers")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customer.id);

        if (error) throw error;

        toast({
          title: "Customer Updated",
          description: "Customer information has been successfully updated.",
        });
      } else {
        const { error } = await supabase
          .from("customers")
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Customer Created",
          description: "New customer has been successfully created.",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        title: "Error",
        description: "Failed to save customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomerPersonalInfoForm
            formData={{
              first_name: formData.first_name,
              last_name: formData.last_name,
              email: formData.email,
              phone: formData.phone,
            }}
            onFormDataChange={handleFormDataChange}
          />

          <CustomerAddressForm
            formData={{
              full_address: formData.full_address,
              suburb_id: formData.suburb_id,
            }}
            deliveryRate={deliveryRate}
            onFormDataChange={handleFormDataChange}
            onSuburbChange={handleSuburbChange}
          />

          <CustomerPreferencesForm
            formData={{
              customer_type: formData.customer_type,
              is_active: formData.is_active,
              sms_notifications_enabled: formData.sms_notifications_enabled,
            }}
            onFormDataChange={handleFormDataChange}
          />

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Saving..." : isEditMode ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
