
import { formatCardBrand } from "../utils/paymentMethodUtils";

interface PaymentMethod {
  id: string;
  label: string;
  description: string;
}

interface SavedCard {
  is_default: boolean;
  card_brand: string;
  card_last_four: string;
  card_exp_month: number;
  card_exp_year: number;
}

interface SelectedPaymentInfoProps {
  paymentMethod: string;
  selectedMethod?: PaymentMethod;
  defaultCard?: SavedCard;
}

export function SelectedPaymentInfo({ paymentMethod, selectedMethod, defaultCard }: SelectedPaymentInfoProps) {
  if (!paymentMethod || !selectedMethod) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        <span className="font-medium text-green-900">Selected Payment Method</span>
      </div>
      <p className="text-sm text-green-700">
        {selectedMethod.label}
      </p>
      {paymentMethod === 'account' && (
        <p className="text-xs text-green-600 mt-1">
          This order will be added to your monthly billing cycle.
        </p>
      )}
      {paymentMethod === '7_day_invoice' && (
        <p className="text-xs text-green-600 mt-1">
          An invoice will be sent with 7-day payment terms. Credit card surcharge will be applied.
        </p>
      )}
      {paymentMethod === 'card_on_file' && defaultCard && (
        <p className="text-xs text-green-600 mt-1">
          Charge will be processed using your {formatCardBrand(defaultCard.card_brand)} ending in {defaultCard.card_last_four}.
        </p>
      )}
      {paymentMethod === 'in_yard_card' && (
        <p className="text-xs text-green-600 mt-1">
          Credit card payment will be processed on-site. Surcharge will be applied.
        </p>
      )}
      {paymentMethod === 'in_yard_cash' && (
        <p className="text-xs text-green-600 mt-1">
          Cash payment will be collected on-site. No surcharge applies.
        </p>
      )}
    </div>
  );
}
