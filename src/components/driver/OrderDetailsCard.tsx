import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getTruckInfo } from "@/utils/truckUtils";
import { Package, DollarSign, Calendar, Clock, ChevronDown, Weight, CreditCard } from "lucide-react";
import { useState } from "react";
interface OrderDetailsCardProps {
  order: any;
}
export function OrderDetailsCard({
  order
}: OrderDetailsCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const truckInfo = getTruckInfo(order.truck_type);
  const products = Array.isArray(order.products) ? order.products : [];
  const formatDeliveryDate = (date: string) => {
    if (!date) return 'Not scheduled';
    return new Date(date).toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };
  const formatDeliveryTime = (time: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  return <div className="space-y-3">
      {/* Truck Assignment */}
      {truckInfo && <div className={`rounded-lg p-3 ${truckInfo.bgClass}`}>
          <div className="flex items-center gap-2">
            <truckInfo.icon className={`w-5 h-5 ${truckInfo.colorClass}`} />
            <div>
              <div className={`font-semibold ${truckInfo.colorClass}`}>
                {truckInfo.label}
              </div>
              <div className={`text-sm ${truckInfo.colorClass}/80`}>
                {truckInfo.capacity} • {truckInfo.description}
              </div>
            </div>
          </div>
        </div>}

      {/* Delivery Schedule */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="font-medium">
            {formatDeliveryDate(order.delivery_date)}
          </span>
          {order.delivery_time && <>
              <Clock className="w-4 h-4 text-slate-500 ml-2" />
              <span>{formatDeliveryTime(order.delivery_time)}</span>
            </>}
        </div>
      </div>

      {/* Payment Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-500" />
          <span className="text-sm">Payment:</span>
          <Badge variant={order.payment_status === 'paid' ? 'default' : 'outline'}>
            {order.payment_status || 'pending'}
          </Badge>
        </div>
        <div className="text-right">
          <div className="font-semibold text-green-600">
            ${order.total_amount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Collapsible Details */}
      <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-slate-700 rounded bg-blue-500 hover:bg-blue-400">
          <span>Order Details</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 pt-2">
          {/* Product Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Package className="w-4 h-4" />
              <span>Items ({products.length})</span>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              {products.map((product: any, index: number) => <div key={index} className="flex justify-between text-sm">
                  <div>
                    <div className="font-medium">
                      {typeof product === 'string' ? product : product.name || 'Item'}
                    </div>
                    {product.quantity && <div className="text-slate-600">
                        Qty: {product.quantity}
                      </div>}
                  </div>
                  {product.price && <div className="text-slate-700">
                      ${product.price.toFixed(2)}
                    </div>}
                </div>)}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <DollarSign className="w-4 h-4" />
              <span>Cost Breakdown</span>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
              {order.subtotal > 0 && <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>}
              {order.delivery_fee > 0 && <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>${order.delivery_fee.toFixed(2)}</span>
                </div>}
              {order.adjustments !== 0 && <div className="flex justify-between">
                  <span>Adjustments:</span>
                  <span className={order.adjustments > 0 ? 'text-green-600' : 'text-red-600'}>
                    ${order.adjustments.toFixed(2)}
                  </span>
                </div>}
              <div className="border-t pt-1 flex justify-between font-semibold">
                <span>Total:</span>
                <span>${order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          {order.payment_method && <div className="text-sm">
              <span className="text-slate-600">Payment Method: </span>
              <span className="font-medium">{order.payment_method}</span>
            </div>}
        </CollapsibleContent>
      </Collapsible>
    </div>;
}