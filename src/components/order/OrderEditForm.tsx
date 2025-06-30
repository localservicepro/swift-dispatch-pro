import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useOrderFormData } from "./hooks/useOrderFormData";
import { useConflictDetection } from "./hooks/useConflictDetection";
import { OrderEditFooter } from "./OrderEditFooter";
import { OrderEditSections } from "./OrderEditSections";
import { OrderEditConflictSection } from "./OrderEditConflictSection";
import { ConflictResult } from "@/utils/conflictDetection";
import { useQueryClient } from "@tanstack/react-query";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type TruckType = Database["public"]["Enums"]["truck_type"];

interface Order {
  id: string;
  order_number: string;
  purchase_order?: string;
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
  company_name?: string;
  business_name?: string;
  customer_type?: string;
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
  const [deliveryRate, setDeliveryRate] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    formData,
    setFormData,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
    handleProductsChange,
    handleSubtotalChange,
    getFormDataForSubmission,
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

  // Prepare business information from order data
  const businessInfo = {
    company_name: order.company_name,
    business_name: order.business_name,
    customer_type: order.customer_type
  };

  // Enhanced cache invalidation function for order updates
  const invalidateOrderCaches = async (reason?: string) => {
    console.log(`Invalidating order caches after edit: ${reason || 'order update'}`);
    
    // Force invalidate all order-related queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['opportunity-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['deleted-orders'] })
    ]);
    
    // Force immediate refetch for opportunity pipeline
    await queryClient.refetchQueries({ queryKey: ['opportunity-orders'] });
    
    console.log('Order caches invalidated and refetched');
  };

  // Fetch delivery rate when suburb changes
  useEffect(() => {
    const fetchDeliveryRate = async () => {
      if (formData.suburb_id) {
        const { data, error } = await supabase
          .from('suburbs')
          .select('delivery_rate')
          .eq('id', formData.suburb_id)
          .single();

        if (error) {
          console.error("Error fetching suburb:", error);
        } else if (data) {
          setDeliveryRate(data.delivery_rate);
        }
      }
    };

    fetchDeliveryRate();
  }, [formData.suburb_id]);

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
      // Get form data with proper time format for database submission
      const submissionData = getFormDataForSubmission();
      
      // Check if delivery address has changed for enhanced logging
      const deliveryAddressChanged = submissionData.customer_address !== order.customer_address;
      console.log('Order update - delivery address changed:', deliveryAddressChanged);
      
      // If truck assignment changed, update the old truck status and new truck status
      if (submissionData.truck_id !== order.truck_id) {
        // Set old truck back to available if it was assigned
        if (order.truck_id) {
          await supabase
            .from('trucks')
            .update({ status: 'available' })
            .eq('id', order.truck_id);
        }

        // Set new truck to assigned if one is selected
        if (submissionData.truck_id && submissionData.truck_id !== 'none') {
          await supabase
            .from('trucks')
            .update({ status: 'assigned' })
            .eq('id', submissionData.truck_id);
        }
      }

      // Update the order with delivery_address explicitly set
      const updateData = {
        customer_name: submissionData.customer_name,
        purchase_order: submissionData.purchase_order || null,
        customer_phone: submissionData.customer_phone || null,
        customer_address: submissionData.customer_address,
        delivery_address: submissionData.customer_address, // Ensure delivery_address is updated
        products: submissionData.products,
        total_amount: parseFloat(submissionData.total_amount),
        subtotal: submissionData.subtotal,
        status: submissionData.status as OrderStatus,
        delivery_date: submissionData.delivery_date || null,
        delivery_time: submissionData.delivery_time || null,
        special_instructions: submissionData.special_instructions || null,
        driver_id: submissionData.driver_id === 'unassigned' ? null : submissionData.driver_id,
        delivery_fee: submissionData.delivery_fee,
        truck_type: submissionData.truck_type === 'none' ? null : submissionData.truck_type as TruckType,
        truck_id: submissionData.truck_id === 'none' ? null : submissionData.truck_id,
        updated_at: new Date().toISOString(),
      };

      console.log('Updating order with data:', updateData);

      const { error: orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Update order_items table to reflect product changes
      if (submissionData.products.length > 0) {
        // Delete existing order items
        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', order.id);

        // Insert updated order items
        const orderItems = submissionData.products.map((item) => ({
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
      if (order.customer_id && submissionData.suburb_id && submissionData.suburb_id !== order.suburb_id) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            suburb_id: submissionData.suburb_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.customer_id);

        if (customerError) {
          console.error('Error updating customer suburb:', customerError);
          // Don't throw here as the order update was successful
        }
      }

      // ENHANCED: Manual cache invalidation after successful order update
      await invalidateOrderCaches(deliveryAddressChanged ? 'delivery address changed' : 'order data changed');

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

  const handleFormDataChange = (updates: any) => {
    if (updates.full_address !== undefined) {
      handleInputChange('customer_address', updates.full_address);
    }
    if (updates.suburb_id !== undefined) {
      handleSuburbChange(updates.suburb_id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <OrderEditSections
        formData={formData}
        deliveryRate={deliveryRate}
        orderId={order.id}
        businessInfo={businessInfo}
        onInputChange={handleInputChange}
        onDriverChange={handleDriverChange}
        onSuburbChange={handleSuburbChange}
        onProductsChange={handleProductsChange}
        onSubtotalChange={handleSubtotalChange}
        onFormDataChange={handleFormDataChange}
      />

      <OrderEditConflictSection
        deliveryDate={formData.delivery_date}
        deliveryTime={formData.delivery_time}
        driverConflict={driverConflict}
        truckConflict={truckConflict}
        isChecking={isChecking}
      />

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
