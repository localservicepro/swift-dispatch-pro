
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CustomerPreferencesFormProps {
  formData: {
    customer_type: "trade" | "account";
    is_active: boolean;
    sms_notifications_enabled: boolean;
  };
  onFormDataChange: (updates: Partial<CustomerPreferencesFormProps['formData']>) => void;
}

export function CustomerPreferencesForm({ formData, onFormDataChange }: CustomerPreferencesFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="customer_type">Customer Type</Label>
        <Select
          value={formData.customer_type}
          onValueChange={(value: "trade" | "account") => 
            onFormDataChange({ customer_type: value })
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
          onCheckedChange={(checked) => onFormDataChange({ is_active: checked })}
        />
        <Label htmlFor="is_active">Active Customer</Label>
      </div>

      <div className="flex items-start space-x-2">
        <div className="mt-1">
          <Switch
            id="sms_notifications_enabled"
            checked={formData.sms_notifications_enabled}
            onCheckedChange={(checked) => 
              onFormDataChange({ sms_notifications_enabled: checked })
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
    </>
  );
}
