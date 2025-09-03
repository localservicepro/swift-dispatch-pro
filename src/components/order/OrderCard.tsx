import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PurchaseOrderDisplay } from "./PurchaseOrderDisplay";
import { NotesIndicator } from "../notes/NotesIndicator";
import { NotesDisplaySection } from "../notes/NotesDisplaySection";
import { PaymentStatusDropdown } from "../opportunity/PaymentStatusDropdown";
import { ReturnStatusBadge } from "./returns/ReturnStatusBadge";
import { OrderReturnDialog } from "./returns/OrderReturnDialog";
import { MapPin, Truck, Edit3, Trash2, Building, User, Calendar, ShoppingBag, RotateCcw } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { StopCreditIndicator } from "@/components/customer/StopCreditIndicator";
import { formatDeliveredDate } from "@/utils/dateTimeUtils";
import { getOrderTypeColors, getOrderTypeLabel, getOrderTypeIcon } from "@/utils/orderTypeColors";
import { useOrderReturns } from "@/hooks/useOrderReturns";
import { useState } from "react";
import { cn } from "@/lib/utils";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string;
  purchase_order?: string;
  customer_name: string;
  contact_name?: string;
  contact_phone?: string;
  customer_phone?: string;
  customer_address: string;
  delivery_address?: string;
  products: any;
  products_formatted?: string;
  total_amount: number;
  status: OrderStatus;
  payment_status?: string;
  payment_date?: string;
  driver_id?: string;
  created_at: string;
  delivery_date?: string;
  delivery_time?: string;
  special_instructions?: string;
  customer_id?: string;
  suburb_id?: string;
  delivery_suburb_id?: string;
  delivery_fee?: number;
  subtotal?: number;
  order_notes?: string;
  delivery_notes?: string;
  driver_name?: string;
  truck_registration?: string;
  truck_type_display?: string;
  suburb_name?: string;
  suburb_state?: string;
  suburb_postcode?: string;
  delivery_suburb_name?: string;
  delivery_suburb_state?: string;
  delivery_suburb_postcode?: string;
  company_name?: string;
  business_name?: string;
  customer_type?: string;
  stop_credit?: boolean;
  delivered_at?: string;
  delivery_method?: string;
}

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus, currentOrder: Order) => void;
  onNotesEdit: (order: Order) => void;
  onPaymentStatusUpdate?: () => void;
}

export function OrderCard({ order, onEdit, onDelete, onStatusUpdate, onNotesEdit, onPaymentStatusUpdate }: OrderCardProps) {
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const { getReturnStats, invalidateReturns } = useOrderReturns();
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "en_route":
        return "bg-blue-100 text-blue-800";
      case "loading":
        return "bg-orange-100 text-orange-800";
      case "preparing":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case "en_route":
        return "En Route";
      case "delivered":
        return "Delivered";
      case "loading":
        return "Loading";
      case "preparing":
        return "Preparing";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  // Determine display name and company info
  const getDisplayInfo = () => {
    // Check for company name (account customers)
    if (order.company_name) {
      // Prioritize contact_name if available, otherwise fall back to customer_name
      const contactName = order.contact_name || order.customer_name;
      const hasValidContact = contactName && 
        contactName !== 'null null' && 
        contactName.trim() !== '' &&
        contactName !== 'null' &&
        contactName !== 'undefined';
      
      return {
        displayName: order.company_name,
        contactInfo: hasValidContact ? contactName : null,
        isCompany: true
      };
    }
    
    // Check for business name (business customers)
    if (order.business_name) {
      // Prioritize contact_name if available, otherwise fall back to customer_name
      const contactName = order.contact_name || order.customer_name;
      const hasValidContact = contactName && 
        contactName !== 'null null' && 
        contactName.trim() !== '' &&
        contactName !== 'null' &&
        contactName !== 'undefined';
      
      return {
        displayName: order.business_name,
        contactInfo: hasValidContact ? contactName : null,
        isCompany: true
      };
    }
    
    // Default to contact name if available, otherwise customer name
    return {
      displayName: order.contact_name || order.customer_name,
      contactInfo: null,
      isCompany: false
    };
  };

  const { displayName, contactInfo, isCompany } = getDisplayInfo();
  
  // Get return stats for this order
  const returnStats = getReturnStats(order.id);
  
  // Get order type styling
  const orderTypeColors = getOrderTypeColors(order.delivery_method);
  const orderTypeLabel = getOrderTypeLabel(order.delivery_method);
  const orderTypeIconName = getOrderTypeIcon(order.delivery_method);
  const OrderTypeIcon = orderTypeIconName === 'Truck' ? Truck : ShoppingBag;

  const formatProducts = (products: any, productsFormatted?: string) => {
    if (productsFormatted && productsFormatted.trim() !== '') {
      return productsFormatted;
    }
    
    if (!products) return 'No products';
    if (Array.isArray(products)) {
      return products.map(p => {
        const name = p.name || p.product_name || 'Product';
        const quantity = p.quantity || 1;
        return `${name} (Qty: ${quantity})`;
      }).join(', ');
    }
    return 'Products listed';
  };

  // Create formatted truck info using denormalized fields
  let truckDisplayInfo = '';
  if (order.truck_type_display && order.truck_registration) {
    truckDisplayInfo = `${order.truck_type_display} ${order.truck_registration}`;
  } else if (order.truck_type_display) {
    truckDisplayInfo = order.truck_type_display;
  } else if (order.truck_registration) {
    truckDisplayInfo = order.truck_registration;
  }

  // Get delivery suburb info - prioritize delivery suburb over customer suburb
  const getDeliverySuburbInfo = () => {
    if (order.delivery_suburb_name) {
      return `${order.delivery_suburb_name}, ${order.delivery_suburb_state}${order.delivery_suburb_postcode ? ` (${order.delivery_suburb_postcode})` : ''}`;
    }
    // Fallback to customer suburb if delivery suburb not available
    if (order.suburb_name) {
      return `${order.suburb_name}, ${order.suburb_state}${order.suburb_postcode ? ` (${order.suburb_postcode})` : ''}`;
    }
    return 'Not specified';
  };

  return (
    <div className={cn(
      "border rounded-lg p-4 transition-colors",
      orderTypeColors.card,
      orderTypeColors.border,
      orderTypeColors.leftBorder,
      orderTypeColors.hoverBorder
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            {order.order_number}
            {order.stop_credit && (
              <StopCreditIndicator />
            )}
          </h3>
          <Badge className={orderTypeColors.badge}>
            <OrderTypeIcon className="w-3 h-3 mr-1" />
            {orderTypeLabel}
          </Badge>
          <Badge className={getStatusColor(order.status)}>
            {getStatusLabel(order.status)}
          </Badge>
          <PaymentStatusDropdown 
            order={order} 
            onStatusUpdate={() => onPaymentStatusUpdate?.()} 
          />
          <PurchaseOrderDisplay purchaseOrder={order.purchase_order} variant="secondary" />
          <NotesIndicator 
            orderNotes={order.order_notes} 
            deliveryNotes={order.delivery_notes} 
          />
          <ReturnStatusBadge
            hasReturns={returnStats.hasReturns}
            returnStatus={returnStats.latestReturnStatus}
            totalItemsReturned={returnStats.totalItemsReturned}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-green-600">
            ${order.total_amount.toFixed(2)}
          </span>
          {(order.order_notes?.trim() || order.delivery_notes?.trim()) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNotesEdit(order)}
              className="h-8 w-8 p-0"
            >
              <Edit3 className="w-4 h-4 text-slate-500 hover:text-slate-700" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Order Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
        <div>
          <p className="text-slate-500 flex items-center gap-1">
            {isCompany ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
            Customer
          </p>
          <p className="font-bold">{displayName}</p>
          {contactInfo && <p className="text-xs text-slate-400">Contact: {contactInfo}</p>}
          {/* Phone Numbers - Simplified logic */}
          {order.contact_phone ? (
            <>
              <p className="text-xs text-slate-400">Contact: {order.contact_phone}</p>
              {order.customer_phone && order.customer_phone !== order.contact_phone && (
                <p className="text-xs text-slate-400">Customer: {order.customer_phone}</p>
              )}
            </>
          ) : order.customer_phone ? (
            <p className="text-xs text-slate-400">{order.customer_phone}</p>
          ) : null}
        </div>
        <div>
          <p className="text-slate-500">Products</p>
          <p className="font-medium">{formatProducts(order.products, order.products_formatted)}</p>
        </div>
        <div>
          <p className="text-slate-500">Driver</p>
          <p className="font-medium">{order.driver_name || 'Not Assigned'}</p>
        </div>
        <div>
          <p className="text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Delivery Suburb
          </p>
          <p className="font-medium">
            {getDeliverySuburbInfo()}
          </p>
        </div>
      </div>

      {/* Truck Information using denormalized fields */}
      {truckDisplayInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <p className="text-slate-500 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              Assigned Truck
            </p>
            <p className="font-medium">{truckDisplayInfo}</p>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {(order.order_notes?.trim() || order.delivery_notes?.trim()) && (
        <div className="mb-3">
          <NotesDisplaySection
            orderNotes={order.order_notes}
            deliveryNotes={order.delivery_notes}
            compact={false}
            onEditClick={() => onNotesEdit(order)}
            userRole="admin"
          />
        </div>
      )}

      {/* Order Meta Information */}
      <div className="mt-3 text-xs text-slate-400">
        <p>Delivery Address: {order.delivery_address || order.customer_address}</p>
        <p>Created: {new Date(order.created_at).toLocaleDateString()}</p>
        {order.delivery_date && (
          <p>Scheduled: {order.delivery_date} {order.delivery_time && `at ${order.delivery_time}`}</p>
        )}
        {order.delivered_at && (
          <p className="text-green-600 font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Delivered: {formatDeliveredDate(order.delivered_at)}
          </p>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <Button size="sm" variant="outline" onClick={() => onEdit(order)}>
          Edit
        </Button>
        
        {/* Quick status update buttons for admin */}
        {order.status === 'preparing' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusUpdate(order.id, 'loading', order)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            Mark Loading
          </Button>
        )}
        
        {order.status === 'loading' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusUpdate(order.id, 'en_route', order)}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            Mark En Route
          </Button>
        )}
        
        {order.status === 'en_route' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusUpdate(order.id, 'delivered', order)}
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            Mark Delivered
          </Button>
        )}
        
        {order.status === 'delivered' && (
          <Button
            size="sm"
            variant="outline"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => setShowReturnDialog(true)}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Return Items
          </Button>
        )}
        
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => onStatusUpdate(order.id, 'cancelled', order)}
        >
          Cancel
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => onDelete(order)}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>

      {/* Return Dialog */}
      <OrderReturnDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        order={order}
        onReturnCreated={invalidateReturns}
      />
    </div>
  );
}
