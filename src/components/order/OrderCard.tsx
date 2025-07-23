import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PurchaseOrderDisplay } from "./PurchaseOrderDisplay";
import { NotesIndicator } from "../notes/NotesIndicator";
import { NotesDisplaySection } from "../notes/NotesDisplaySection";
import { PaymentStatusDropdown } from "../opportunity/PaymentStatusDropdown";
import { MapPin, Truck, Edit3, Trash2, Building, User, Store, ArrowRight } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { getDeliveryMethodLabel } from "@/utils/customerTypeColors";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string;
  purchase_order?: string;
  customer_name: string;
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
  delivery_method?: string;
  pickup_location_address?: string;
  pickup_location_name?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_instructions?: string;
  pickup_date?: string;
  pickup_time?: string;
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

  const getDisplayInfo = () => {
    if (order.company_name) {
      const hasValidContact = order.customer_name && 
        order.customer_name !== 'null null' && 
        order.customer_name.trim() !== '' &&
        order.customer_name !== 'null' &&
        order.customer_name !== 'undefined';
      
      return {
        displayName: order.company_name,
        contactInfo: hasValidContact ? order.customer_name : null,
        isCompany: true
      };
    }
    
    if (order.business_name) {
      const hasValidContact = order.customer_name && 
        order.customer_name !== 'null null' && 
        order.customer_name.trim() !== '' &&
        order.customer_name !== 'null' &&
        order.customer_name !== 'undefined';
      
      return {
        displayName: order.business_name,
        contactInfo: hasValidContact ? order.customer_name : null,
        isCompany: true
      };
    }
    
    return {
      displayName: order.customer_name,
      contactInfo: null,
      isCompany: false
    };
  };

  const { displayName, contactInfo, isCompany } = getDisplayInfo();

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

  let truckDisplayInfo = '';
  if (order.truck_type_display && order.truck_registration) {
    truckDisplayInfo = `${order.truck_type_display} ${order.truck_registration}`;
  } else if (order.truck_type_display) {
    truckDisplayInfo = order.truck_type_display;
  } else if (order.truck_registration) {
    truckDisplayInfo = order.truck_registration;
  }

  const getDeliverySuburbInfo = () => {
    if (order.delivery_suburb_name) {
      return `${order.delivery_suburb_name}, ${order.delivery_suburb_state}${order.delivery_suburb_postcode ? ` (${order.delivery_suburb_postcode})` : ''}`;
    }
    if (order.suburb_name) {
      return `${order.suburb_name}, ${order.suburb_state}${order.suburb_postcode ? ` (${order.suburb_postcode})` : ''}`;
    }
    return 'Not specified';
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-800">{order.order_number}</h3>
          <Badge className={getStatusColor(order.status)}>
            {getStatusLabel(order.status)}
          </Badge>
          {order.delivery_method && order.delivery_method !== 'delivery' && (
            <Badge variant="outline" className="text-purple-600 border-purple-200">
              {getDeliveryMethodLabel(order.delivery_method)}
            </Badge>
          )}
          <PaymentStatusDropdown 
            order={order} 
            onStatusUpdate={() => onPaymentStatusUpdate?.()} 
          />
          <PurchaseOrderDisplay purchaseOrder={order.purchase_order} variant="secondary" />
          <NotesIndicator 
            orderNotes={order.order_notes} 
            deliveryNotes={order.delivery_notes} 
            specialInstructions={order.special_instructions} 
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-green-600">
            ${order.total_amount.toFixed(2)}
          </span>
          {(order.order_notes?.trim() || order.delivery_notes?.trim() || order.special_instructions?.trim()) && (
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
        <div>
          <p className="text-slate-500 flex items-center gap-1">
            {isCompany ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
            Customer
          </p>
          <p className="font-bold">{displayName}</p>
          {contactInfo && <p className="text-xs text-slate-400">Contact: {contactInfo}</p>}
          {order.customer_phone && <p className="text-xs text-slate-400">{order.customer_phone}</p>}
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

      {order.delivery_method === 'pickup_delivery' && order.pickup_location_address && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
          <div className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
            <Store className="w-4 h-4" />
            Pickup & Delivery Details
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-purple-700 font-medium">Pickup From:</p>
              <p className="text-slate-700">{order.pickup_location_name || 'Pickup Location'}</p>
              <p className="text-slate-600 text-xs">{order.pickup_location_address}</p>
              {order.pickup_contact_name && (
                <p className="text-slate-600 text-xs">
                  Contact: {order.pickup_contact_name}
                  {order.pickup_contact_phone && ` • ${order.pickup_contact_phone}`}
                </p>
              )}
              {order.pickup_date && (
                <p className="text-slate-600 text-xs">
                  Date: {order.pickup_date} {order.pickup_time && `at ${order.pickup_time}`}
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      )}

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

      {(order.order_notes?.trim() || order.delivery_notes?.trim() || order.special_instructions?.trim()) && (
        <div className="mb-3">
          <NotesDisplaySection
            orderNotes={order.order_notes}
            deliveryNotes={order.delivery_notes}
            specialInstructions={order.special_instructions}
            compact={false}
            onEditClick={() => onNotesEdit(order)}
          />
        </div>
      )}

      <div className="mt-3 text-xs text-slate-400">
        <p>Delivery Address: {order.delivery_address || order.customer_address}</p>
        <p>Created: {new Date(order.created_at).toLocaleDateString()}</p>
        {order.delivery_date && (
          <p>Delivery: {order.delivery_date} {order.delivery_time && `at ${order.delivery_time}`}</p>
        )}
      </div>
      
      <div className="flex gap-2 mt-4">
        <Button size="sm" variant="outline" onClick={() => onEdit(order)}>
          Edit
        </Button>
        
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
    </div>
  );
}
