
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { formatCardBrand } from "../utils/paymentMethodUtils";

interface PaymentMethod {
  id: string;
  label: string;
  description: string;
  icon: any;
  available: boolean;
  hasSurcharge: boolean;
}

interface SavedCard {
  is_default: boolean;
  card_brand: string;
  card_last_four: string;
  card_exp_month: number;
  card_exp_year: number;
}

interface PaymentMethodCardProps {
  method: PaymentMethod;
  paymentMethod: string;
  defaultCard?: SavedCard;
}

export function PaymentMethodCard({ method, paymentMethod, defaultCard }: PaymentMethodCardProps) {
  const IconComponent = method.icon;
  
  return (
    <div
      className={`flex items-start space-x-3 rounded-lg border p-4 ${
        method.available
          ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
          : 'border-gray-100 bg-gray-50 opacity-60'
      } ${paymentMethod === method.id ? 'border-blue-500 bg-blue-50' : ''}`}
    >
      <RadioGroupItem
        value={method.id}
        id={method.id}
        disabled={!method.available}
        className="mt-1"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <IconComponent className="w-4 h-4 text-gray-600" />
          <Label
            htmlFor={method.id}
            className={`font-medium cursor-pointer ${
              method.available ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            {method.label}
          </Label>
          {method.hasSurcharge && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
              Surcharge applies
            </span>
          )}
          {!method.available && method.id === 'account' && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
              Account customers only
            </span>
          )}
          {!method.available && method.id === 'card_on_file' && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
              No saved cards
            </span>
          )}
        </div>
        <p className={`text-sm ${method.available ? 'text-gray-600' : 'text-gray-400'}`}>
          {method.description}
        </p>
        
        {/* Show card details when Card on File is selected and available */}
        {method.id === 'card_on_file' && method.available && paymentMethod === method.id && defaultCard && (
          <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-xs">
            <div className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-600" />
              <span className="font-medium">
                {formatCardBrand(defaultCard.card_brand)} •••• {defaultCard.card_last_four}
              </span>
              <span className="text-gray-500">
                {defaultCard.card_exp_month.toString().padStart(2, '0')}/{defaultCard.card_exp_year}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
