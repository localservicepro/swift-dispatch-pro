
import { Badge } from "@/components/ui/badge";
import { getCustomerTypeColors, getCustomerTypeLabel, getDeliveryMethodColors, getDeliveryMethodLabel } from "@/utils/customerTypeColors";
import { AlertTriangle, Truck, Store, ArrowRightLeft } from "lucide-react";

export function OpportunityCardColorLegend() {
  const customerTypes = ['account', 'trade', 'residential'] as const;
  const deliveryMethods = ['delivery', 'pickup', 'pickup_delivery'] as const;

  const getDeliveryMethodIcon = (method: string) => {
    switch (method) {
      case 'pickup_delivery':
        return <ArrowRightLeft className="w-3 h-3" />;
      case 'pickup':
        return <Store className="w-3 h-3" />;
      case 'delivery':
      default:
        return <Truck className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
      {/* Customer Types */}
      <div className="flex items-center gap-4">
        <span className="font-medium">Customer Types:</span>
        {customerTypes.map((type) => {
          const colors = getCustomerTypeColors(type);
          const label = getCustomerTypeLabel(type);
          
          return (
            <div key={type} className="flex items-center gap-1">
              <div 
                className={`w-3 h-3 rounded border ${colors.card} ${colors.border}`}
              />
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Delivery Methods */}
      <div className="flex items-center gap-4">
        <span className="font-medium">Delivery Methods:</span>
        {deliveryMethods.map((method) => {
          const colors = getDeliveryMethodColors(method);
          const label = getDeliveryMethodLabel(method);
          
          return (
            <div key={method} className="flex items-center gap-1">
              <div 
                className={`w-3 h-3 rounded border ${colors.card} ${colors.border} flex items-center justify-center`}
              >
                {getDeliveryMethodIcon(method)}
              </div>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      
      {/* Payment Status Indicator */}
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded border bg-red-50 border-red-200" />
        <AlertTriangle className="w-3 h-3 text-red-500" />
        <span>Payment Pending</span>
      </div>
    </div>
  );
}
