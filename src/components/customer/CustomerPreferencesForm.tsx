
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CustomerPreferencesFormProps {
  formData: {
    customer_type: "residential" | "trade" | "account";
    entity_type: "individual" | "business";
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

      {/* Suggested Pricing Tier Display */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="font-medium text-gray-800 mb-2">Suggested Pricing Tier</h4>
        <p className="text-sm text-gray-600">
          Based on customer type: <strong>
            {formData.customer_type === 'residential' ? 'Individual' : 
             formData.customer_type === 'trade' ? 'Trade' : 'Account'}
          </strong>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Pricing tiers can be customized in the Pricing Management section
        </p>
      </div>
    </>
  );
}
