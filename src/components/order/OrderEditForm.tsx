
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { DriverSelector } from "./DriverSelector";
import { SuburbSelector } from "./SuburbSelector";
import { OrderBasicInfoForm } from "./OrderBasicInfoForm";
import { OrderPricingForm } from "./OrderPricingForm";
import { OrderTruckSelectionForm } from "./OrderTruckSelectionForm";
import { OrderDeliveryForm } from "./OrderDeliveryForm";
import { ConflictWarning } from "./ConflictWarning";
import { ProductEditSection } from "./ProductEditSection";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { useOrderFormData, OrderFormData } from "./hooks/useOrderFormData";
import { useConflictDetection } from "./hooks/useConflictDetection";
import { OrderEditFooter } from "./OrderEditFooter";
import { ConflictResult } from "@/utils/conflictDetection";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type TruckType = Database["public"]["Enums"]["truck_type"];

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  products: any;
  total_amount: number;
  status: OrderStatus;
  driver_id?: string;
  created_at: string;
  delivery_date?: string;
  delivery_time?: string;
  special_instructions?: string;
  customer_id?: string;
  suburb_id?: string;
  delivery_fee?: number;
  subtotal?: number;
  truck_type?: TruckType;
  truck_id?: string;
  payment_method?: string;
}

interface OrderEditFormProps {
  order: Order;
  onOrderUpdated: () => void;
  onClose: () => void;
}

interface ConflictInfo {
  hasConflict: boolean;
  conflictType?: 'exact' | 'overlap' | 'adjacent';
}

// Helper function to convert ConflictResult to ConflictInfo
const convertToConflictInfo = (conflictResult?: ConflictResult): ConflictInfo => {
  if (!conflictResult || !conflictResult.hasConflict) {
    return { hasConflict: false };
  }

  // Map conflict types from ConflictResult to ConflictInfo format
  let conflictType: 'exact' | 'overlap' | 'adjacent';
  switch (conflictResult.conflictType) {
    case 'exact':
      conflictType = 'exact';
      break;
    case 'overlap':
      conflictType = 'overlap';
      break;
    case 'same-day':
      conflictType = 'adjacent'; // Map same-day to adjacent
      break;
    default:
      conflictType = 'adjacent'; // Default fallback
      break;
  }

  return {
    hasConflict: conflictResult.hasConflict,
    conflictType
  };
};

export function OrderEditForm({ order, onOrderUpdated, onClose }: OrderEditFormProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  const {
    formData,
    setFormData,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
    handleProductsChange,
    handleSubtotalChange,
    handlePaymentMethodChange,
  } = useOrderFormData(order);

  // Use conflict detection hook
  const {
    driverConflict,
    truckConflict,
    isChecking,
    hasAnyConflict
  } = useConflictDetection(
    formData.delivery_date,
    formData.delivery_time,
    formData.driver_id,
    formData.truck_id,
    order.id
  );

  // Create customer object for payment method selector
  const customer = {
    id: order.customer_id || '',
    customer_type: 'regular' // Default, could be enhanced to fetch actual customer type
  };

  // Reset truck selection when truck type changes
  useEffect(() => {
    if (formData.truck_type !== order.truck_type) {
      setFormData(prev => ({ ...prev, truck_id: 'none' }));
    }
  }, [formData.truck_type, order.truck_type, setFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // If truck assignment changed, update the old truck status and new truck status
      if (formData.truck_id !== order.truck_id) {
        // Set old truck back to available if it was assigned
        if (order.truck_id) {
          await supabase
            .from('trucks')
            .update({ status: 'available' })
            .eq('id', order.truck_id);
        }

        // Set new truck to assigned if one is selected
        if (formData.truck_id && formData.truck_id !== 'none') {
          await supabase
            .from('trucks')
            .update({ status: 'assigned' })
            .eq('id', formData.truck_id);
        }
      }

      // Update the order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          customer_address: formData.customer_address,
          products: formData.products,
          total_amount: parseFloat(formData.total_amount),
          subtotal: formData.subtotal,
          status: formData.status,
          delivery_date: formData.delivery_date || null,
          delivery_time: formData.delivery_time || null,
          special_instructions: formData.special_instructions || null,
          driver_id: formData.driver_id === 'unassigned' ? null : formData.driver_id,
          delivery_fee: formData.delivery_fee,
          truck_type: formData.truck_type === 'none' ? null : formData.truck_type as TruckType,
          truck_id: formData.truck_id === 'none' ? null : formData.truck_id,
          payment_method: formData.payment_method,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Update order_items table to reflect product changes
      if (formData.products.length > 0) {
        // Delete existing order items
        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', order.id);

        // Insert updated order items
        const orderItems = formData.products.map((item) => ({
          order_id: order.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          price_adjustment: 0,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Error updating order items:', itemsError);
          // Don't throw here as the main order was updated successfully
        }
      }

      // Update the customer's suburb if customer_id exists and suburb changed
      if (order.customer_id && formData.suburb_id && formData.suburb_id !== order.suburb_id) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            suburb_id: formData.suburb_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.customer_id);

        if (customerError) {
          console.error('Error updating customer suburb:', customerError);
          // Don't throw here as the order update was successful
        }
      }

      toast({
        title: "Success",
        description: "Order updated successfully!",
      });

      onOrderUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Convert conflict results to the format expected by OrderEditFooter
  const driverConflictInfo = convertToConflictInfo(driverConflict);
  const truckConflictInfo = convertToConflictInfo(truckConflict);

  // Check if payment method changes are allowed based on order status
  const isPaymentMethodEditable = !['delivered', 'cancelled'].includes(formData.status);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ProductEditSection
        currentProducts={formData.products}
        onProductsChange={handleProductsChange}
        onSubtotalChange={handleSubtotalChange}
      />

      <OrderBasicInfoForm 
        formData={formData}
        onInputChange={handleInputChange}
      />

      <div>
        <SuburbSelector
          selectedSuburbId={formData.suburb_id}
          onSuburbChange={handleSuburbChange}
        />
      </div>

      <OrderPricingForm 
        formData={formData}
        onInputChange={handleInputChange}
      />

      {/* Payment Method Selection */}
      {order.customer_id && (
        <PaymentMethodSelector
          customer={customer}
          currentPaymentMethod={formData.payment_method}
          onPaymentMethodChange={handlePaymentMethodChange}
          disabled={!isPaymentMethodEditable}
        />
      )}

      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="loading">Loading</SelectItem>
            <SelectItem value="en_route">En Route</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <OrderTruckSelectionForm 
        formData={formData}
        onInputChange={handleInputChange}
        orderId={order.id}
      />

      <div>
        <DriverSelector
          selectedDriverId={formData.driver_id}
          onDriverChange={handleDriverChange}
        />
      </div>

      <OrderDeliveryForm 
        formData={formData}
        onInputChange={handleInputChange}
      />

      {/* Conflict Warning Section */}
      {(formData.delivery_date && formData.delivery_time) && (
        <div className="space-y-2">
          <ConflictWarning 
            driverConflict={driverConflict}
            truckConflict={truckConflict}
          />
          {isChecking && (
            <div className="text-sm text-muted-foreground">
              Checking for conflicts...
            </div>
          )}
        </div>
      )}

      <OrderEditFooter
        isUpdating={isUpdating}
        onClose={onClose}
        driverConflict={driverConflictInfo}
        truckConflict={truckConflictInfo}
        hasAnyConflict={hasAnyConflict}
      />
    </form>
  );
}
