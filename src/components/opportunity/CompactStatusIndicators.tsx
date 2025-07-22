
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, Clock, CheckCircle, CreditCard } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CompactStatusIndicatorsProps {
  order: any;
}

export function CompactStatusIndicators({ order }: CompactStatusIndicatorsProps) {
  const getPaymentStatusIcon = () => {
    switch (order.payment_status) {
      case 'paid':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Paid' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Payment Pending' };
      case 'overdue':
        return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', label: 'Overdue' };
      case 'invoiced':
        return { icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Invoiced' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Unknown' };
    }
  };

  const paymentStatus = getPaymentStatusIcon();
  const PaymentIcon = paymentStatus.icon;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Back Order Status */}
        {order.status === 'back_order' && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-100">
                <Package className="w-3 h-3 text-amber-700" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Back Order</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Payment Status Icon */}
        <Tooltip>
          <TooltipTrigger>
            <div className={`flex items-center justify-center w-6 h-6 rounded ${paymentStatus.bg}`}>
              <PaymentIcon className={`w-3 h-3 ${paymentStatus.color}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{paymentStatus.label}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
