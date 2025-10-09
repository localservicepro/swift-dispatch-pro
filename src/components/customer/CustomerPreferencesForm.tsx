
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CustomerPreferencesFormProps {
  formData: {
    customer_type: "residential" | "trade" | "account";
    entity_type: "individual" | "business";
    is_active: boolean;
    sms_notifications_enabled: boolean;
    stop_credit: boolean;
    portal_access_enabled?: boolean;
  };
  onFormDataChange: (updates: Partial<CustomerPreferencesFormProps['formData']>) => void;
}

export function CustomerPreferencesForm({ formData, onFormDataChange }: CustomerPreferencesFormProps) {
  const isAccountCustomer = formData.customer_type === 'account';

  return (
    <>
      {isAccountCustomer && (
        <div className="flex items-start space-x-2 p-4 bg-primary/5 rounded-lg">
          <div className="mt-1">
            <Switch
              id="portal_access_enabled"
              checked={formData.portal_access_enabled || false}
              onCheckedChange={(checked) => 
                onFormDataChange({ portal_access_enabled: checked })
              }
            />
          </div>
          <div>
            <Label htmlFor="portal_access_enabled" className="block font-semibold">
              Enable Portal Access
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Allow this customer to log in and manage their orders through the account portal
            </p>
          </div>
        </div>
      )}
      
      <div>
        <Label htmlFor="customer_type">Customer Type</Label>
        <Select
          value={formData.customer_type}
          onValueChange={(value: "residential" | "trade" | "account") => 
            onFormDataChange({ customer_type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="trade">Trade</SelectItem>
            <SelectItem value="account">Account</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="entity_type">Entity Type</Label>
        <Select
          value={formData.entity_type}
          onValueChange={(value: "individual" | "business") => 
            onFormDataChange({ entity_type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="business">Business</SelectItem>
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

      <div className="flex items-start space-x-2">
        <div className="mt-1">
          <Switch
            id="stop_credit"
            checked={formData.stop_credit}
            onCheckedChange={(checked) => 
              onFormDataChange({ stop_credit: checked })
            }
          />
        </div>
        <div>
          <Label htmlFor="stop_credit" className="block text-red-700">
            Stop Credit
          </Label>
          <p className="text-xs text-red-600 mt-1">
            Flag this customer for credit issues. A warning will appear when creating orders and a red warning icon will be shown in order management.
          </p>
        </div>
      </div>
    </>
  );
}
