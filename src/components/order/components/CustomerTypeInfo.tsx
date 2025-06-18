
import { Building2 } from "lucide-react";

interface Customer {
  first_name: string;
  last_name: string;
  customer_type: string;
}

interface CustomerTypeInfoProps {
  customer: Customer;
  hasCardOnFile: boolean;
  savedCardsCount: number;
}

export function CustomerTypeInfo({ customer, hasCardOnFile, savedCardsCount }: CustomerTypeInfoProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-blue-900">Customer Type</span>
      </div>
      <p className="text-sm text-blue-700">
        {customer.first_name} {customer.last_name} is an{' '}
        <span className="font-semibold">{customer.customer_type}</span> customer
      </p>
      {hasCardOnFile && (
        <p className="text-xs text-blue-600 mt-1">
          • {savedCardsCount} saved payment method{savedCardsCount !== 1 ? 's' : ''} on file
        </p>
      )}
    </div>
  );
}
