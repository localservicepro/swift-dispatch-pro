
import { 
  Calendar, 
  DollarSign, 
  User, 
  Phone, 
  MapPin, 
  Truck,
  Clock,
  CalendarDays,
  Building,
  Package,
  ShoppingBag
} from "lucide-react";
import { getTruckInfo } from "@/utils/truckUtils";
import { formatDeliveryDate, formatDeliveryTime, formatCreatedDate, formatCreatedTime } from "@/utils/dateTimeUtils";
import { getOrderTypeColors, getOrderTypeLabel, getOrderTypeIcon } from "@/utils/orderTypeColors";
import { Badge } from "@/components/ui/badge";

interface OpportunityCardInfoProps {
  order: any;
  onOrderClick?: (order: any) => void;
}

export function OpportunityCardInfo({ order, onOrderClick }: OpportunityCardInfoProps) {
  const truckInfo = getTruckInfo(order.truck_type_from_truck || order.truck_type);
  const hasDeliverySchedule = order.delivery_date && order.delivery_time;

  // Get the delivery address to display
  const deliveryAddress = order.delivery_address || order.customer_address;

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

  // Get order type styling
  const orderTypeColors = getOrderTypeColors(order.delivery_method);
  const orderTypeLabel = getOrderTypeLabel(order.delivery_method);
  const orderTypeIconName = getOrderTypeIcon(order.delivery_method);
  const OrderTypeIcon = orderTypeIconName === 'Truck' ? Truck : ShoppingBag;

  // Format products for display
  const formatProductsForCard = () => {
    if (order.products_formatted && order.products_formatted.trim() !== '') {
      const items = order.products_formatted.split(',').map((item: string) => item.trim());
      if (items.length === 1) return { text: items[0], hasMore: false };
      return { text: items[0], hasMore: true, additional: items.length - 1 };
    }
    
    if (!order.products) return { text: 'No products', hasMore: false };
    
    if (Array.isArray(order.products)) {
      if (order.products.length === 1) {
        const product = order.products[0];
        const name = product.name || product.product_name || 'Product';
        const quantity = product.quantity || 1;
        return { text: `${name} (Qty: ${quantity})`, hasMore: false };
      } else if (order.products.length > 1) {
        const firstProduct = order.products[0];
        const firstName = firstProduct.name || firstProduct.product_name || 'Product';
        const firstQuantity = firstProduct.quantity || 1;
        return { 
          text: `${firstName} (Qty: ${firstQuantity})`, 
          hasMore: true, 
          additional: order.products.length - 1 
        };
      }
    }
    
    return { text: 'Products listed', hasMore: false };
  };

  const productInfo = formatProductsForCard();

  return (
    <>
      {/* Customer/Company Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          {isCompany ? (
            <Building className="w-3 h-3" />
          ) : (
            <User className="w-3 h-3" />
          )}
          <span className="font-medium">{displayName}</span>
        </div>
        {contactInfo && (
          <div className="flex items-center gap-2 text-xs text-slate-500 ml-5">
            <User className="w-3 h-3" />
            <span>Contact: {contactInfo}</span>
          </div>
        )}
        {/* Phone Numbers - Prioritize contact phone */}
        {(order.contact_phone || order.customer_phone) && (
          <div className="space-y-1">
            {order.contact_phone && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone className="w-3 h-3" />
                <span>Contact: {order.contact_phone}</span>
              </div>
            )}
            {order.customer_phone && order.customer_phone !== order.contact_phone && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Phone className="w-3 h-3" />
                <span>Customer: {order.customer_phone}</span>
              </div>
            )}
            {!order.contact_phone && order.customer_phone && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone className="w-3 h-3" />
                <span>{order.customer_phone}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Type Badge */}
      <div className="mb-3">
        <Badge className={orderTypeColors.badge} variant="secondary">
          <OrderTypeIcon className="w-3 h-3 mr-1" />
          {orderTypeLabel}
        </Badge>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-green-600" />
        <span className="font-bold text-green-600">${order.total_amount.toFixed(2)}</span>
      </div>

      {/* Date and Time Information */}
      <div className="space-y-1 mb-3 text-xs text-slate-500">
        {/* Delivery Schedule - Show if available */}
        {hasDeliverySchedule && (
          <>
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <CalendarDays className="w-3 h-3" />
              <span>Scheduled: {formatDeliveryDate(order.delivery_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <Clock className="w-3 h-3" />
              <span>{formatDeliveryTime(order.delivery_time)}</span>
            </div>
          </>
        )}
        
        {/* Products Information */}
        <div className="flex items-start gap-2">
          <Package className="w-3 h-3 mt-0.5 text-green-600" />
          <div className="flex flex-col">
            <span>{productInfo.text}</span>
            {productInfo.hasMore && onOrderClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOrderClick(order);
                }}
                className="text-blue-600 hover:text-blue-800 text-left text-xs underline"
              >
                and {productInfo.additional} more items - view more
              </button>
            )}
          </div>
        </div>
        
        {/* Delivery Address - Show full address instead of just suburb */}
        {deliveryAddress && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2 break-words">{deliveryAddress}</span>
          </div>
        )}

        {/* Enhanced Truck Information */}
        {(truckInfo || order.truck_registration) && (
          <div className="flex items-center gap-2">
            <Truck className="w-3 h-3" />
            <div className="flex flex-col">
              {truckInfo && (
                <span>{truckInfo.label}</span>
              )}
              {order.truck_registration && (
                <span className="font-medium text-slate-700">#{order.truck_registration}</span>
              )}
            </div>
          </div>
        )}

        {order.driver_name && order.driver_name !== 'Not Assigned' && (
          <div className="flex items-center gap-2">
            <User className="w-3 h-3" />
            <span>Driver: {order.driver_name}</span>
          </div>
        )}
      </div>
    </>
  );
}
