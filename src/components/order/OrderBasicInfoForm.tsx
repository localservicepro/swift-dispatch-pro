
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User, Phone, Building2 } from "lucide-react";
import { OrderFormData } from "./hooks/useOrderFormData";

interface OrderBasicInfoFormProps {
  formData: OrderFormData;
  businessInfo?: {
    company_name?: string;
    business_name?: string;
    customer_type?: string;
  };
  onInputChange: (field: string, value: string) => void;
}

export function OrderBasicInfoForm({ formData, businessInfo, onInputChange }: OrderBasicInfoFormProps) {
  const getDisplayName = () => {
    if (businessInfo?.customer_type === 'account' && businessInfo?.company_name) {
      return businessInfo.company_name;
    }
    if (businessInfo?.business_name) {
      return businessInfo.business_name;
    }
    return null;
  };

  const businessName = getDisplayName();
  const showBusinessInfo = businessName;

  // Determine which contact info to display and edit
  const contactName = formData.contact_name || formData.customer_name;
  const contactPhone = formData.contact_phone || formData.customer_phone;
  const isOrderContact = !!formData.contact_name;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <User className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">Customer Information</h3>
      </div>
      
      {showBusinessInfo && (
        <div className="bg-white border border-blue-100 rounded-md p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Business</span>
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-1">
            {businessName}
          </div>
          <div className="text-sm text-gray-600">
            {isOrderContact ? "Order Contact" : "Contact"}: {contactName}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contact_name" className="text-gray-700 font-medium">
            {isOrderContact ? "Order Contact Name" : "Contact Name"}
          </Label>
          <Input
            id="contact_name"
            value={contactName}
            onChange={(e) => onInputChange(isOrderContact ? 'contact_name' : 'customer_name', e.target.value)}
            required
            className="border-blue-200 focus:border-blue-400 focus:ring-blue-200"
          />
        </div>
        <div>
          <Label htmlFor="contact_phone" className="text-gray-700 font-medium">
            <Phone className="w-4 h-4 inline mr-1" />
            {isOrderContact ? "Order Contact Phone" : "Contact Phone"}
          </Label>
          <Input
            id="contact_phone"
            value={contactPhone}
            onChange={(e) => onInputChange(isOrderContact ? 'contact_phone' : 'customer_phone', e.target.value)}
            className="border-blue-200 focus:border-blue-400 focus:ring-blue-200"
          />
        </div>
      </div>
    </div>
  );
}
