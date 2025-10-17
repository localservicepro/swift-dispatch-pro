
import { MapPin, Phone } from "lucide-react";

interface DeliveryCardCustomerInfoProps {
  order: any;
}

export function DeliveryCardCustomerInfo({ order }: DeliveryCardCustomerInfoProps) {
  // Use delivery_address first, fallback to customer_address for backwards compatibility
  const displayAddress = order.delivery_address || order.customer_address;
  
  // For account customers, show company name + contact name
  const isAccountCustomer = order.customers?.customer_type === 'account';
  const companyName = order.customers?.company_name || order.customers?.business_name;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-slate-700">
        <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
        <div className="flex-1">
          {isAccountCustomer && companyName ? (
            <>
              <div className="font-semibold text-slate-900">{companyName}</div>
              {order.contact_name && (
                <div className="text-sm text-slate-600">Contact: {order.contact_name}</div>
              )}
            </>
          ) : (
            <div className="font-medium text-slate-800">{order.customer_name}</div>
          )}
          <div className="text-sm text-slate-600 mt-1">{displayAddress}</div>
          {order.suburb_name && (
            <div className="text-xs text-slate-500">
              {order.suburb_name}, {order.suburb_state}
            </div>
          )}
        </div>
      </div>
      
      {order.customer_phone && (
        <div className="flex items-center gap-2 text-slate-700 ml-6">
          <Phone className="w-4 h-4 text-slate-500" />
          <a 
            href={`tel:${order.customer_phone}`}
            className="text-blue-600 hover:underline text-sm"
          >
            {order.customer_phone}
          </a>
        </div>
      )}
    </div>
  );
}
