
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SuburbSelector } from "@/components/order/SuburbSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const handleSuburbChange = (suburbId: string, rate: number) => {
    setFormData({ ...formData, suburb_id: suburbId });
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="full_address">Full Address</Label>
            <Input
              id="full_address"
              value={formData.full_address}
              onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
              required
            />
          </div>

          <SuburbSelector
            selectedSuburbId={formData.suburb_id}
            onSuburbChange={handleSuburbChange}
          />

          {deliveryRate > 0 && (
            <div className="text-sm text-gray-600">
              Delivery Rate: ${deliveryRate.toFixed(2)}
            </div>
          )}

          <div>
            <Label htmlFor="customer_type">Customer Type</Label>
            <Select
              value={formData.customer_type}
              onValueChange={(value: "trade" | "account") => 
                setFormData({ ...formData, customer_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trade">Trade</SelectItem>
                <SelectItem value="account">Account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active Customer</Label>
          </div>

          <div className="flex items-start space-x-2">
            <div className="mt-1">
              <Switch
                id="sms_notifications_enabled"
                checked={formData.sms_notifications_enabled}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, sms_notifications_enabled: checked })
                }
              />
            </div>
            <div>
              <Label htmlFor="sms_notifications_enabled" className="block">
                Order Status Notifications
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Receive notifications when order status changes. Invoice notifications will still be sent regardless of this setting.
              </p>
            </div>
          </div>

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
