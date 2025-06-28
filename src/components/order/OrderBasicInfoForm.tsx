
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User, Phone } from "lucide-react";
import { OrderFormData } from "./hooks/useOrderFormData";

interface OrderBasicInfoFormProps {
  formData: OrderFormData;
  onInputChange: (field: string, value: string) => void;
}

export function OrderBasicInfoForm({ formData, onInputChange }: OrderBasicInfoFormProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <User className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">Customer Information</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customer_name" className="text-gray-700 font-medium">Customer Name</Label>
          <Input
            id="customer_name"
            value={formData.customer_name}
            onChange={(e) => onInputChange('customer_name', e.target.value)}
            required
            className="border-blue-200 focus:border-blue-400 focus:ring-blue-200"
          />
        </div>
        <div>
          <Label htmlFor="customer_phone" className="text-gray-700 font-medium">
            <Phone className="w-4 h-4 inline mr-1" />
            Customer Phone
          </Label>
          <Input
            id="customer_phone"
            value={formData.customer_phone}
            onChange={(e) => onInputChange('customer_phone', e.target.value)}
            className="border-blue-200 focus:border-blue-400 focus:ring-blue-200"
          />
        </div>
      </div>
    </div>
  );
}
