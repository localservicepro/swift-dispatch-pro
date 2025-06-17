
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useOrderFormData, OrderFormData } from "./hooks/useOrderFormData";
import { useConflictDetection } from "./hooks/useConflictDetection";

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
}

interface OrderEditDialogProps {
  order: Order;
  onOrderUpdated: () => void;
  onClose: () => void;
}

export function OrderEditDialog({ order, onOrderUpdated, onClose }: OrderEditDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  const {
    formData,
    setFormData,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
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

  // Reset truck selection when truck type changes
  useEffect(() => {
    if (formData.truck_type !== order.truck_type) {
      setFormData(prev => ({ ...prev, truck_id: 'none' }));
    }
  }, [formData.truck_type, order.truck_type, setFormData]);

  const getButtonText = () => {
    if (isUpdating) return "Updating...";
    
    if (hasAnyConflict) {
      const criticalConflicts = [driverConflict, truckConflict].filter(
        conflict => conflict?.hasConflict && (conflict.conflictType === 'exact' || conflict.conflictType === 'overlap')
      );
      
      if (criticalConflicts.length > 0) {
        return "Update Despite Conflicts";
      }
    }
    return "Update Order";
  };

  const getButtonStyle = () => {
    if (hasAnyConflict) {
      const criticalConflicts = [driverConflict, truckConflict].filter(
        conflict => conflict?.hasConflict && (conflict.conflictType === 'exact' || conflict.conflictType === 'overlap')
      );
      
      if (criticalConflicts.length > 0) {
        return "bg-orange-600 hover:bg-orange-700";
      }
    }
    return "";
  };

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
          total_amount: parseFloat(formData.total_amount),
          status: formData.status,
          delivery_date: formData.delivery_date || null,
          delivery_time: formData.delivery_time || null,
          special_instructions: formData.special_instructions || null,
          driver_id: formData.driver_id === 'unassigned' ? null : formData.driver_id,
          delivery_fee: formData.delivery_fee,
          subtotal: formData.subtotal,
          truck_type: formData.truck_type === 'none' ? null : formData.truck_type as TruckType,
          truck_id: formData.truck_id === 'none' ? null : formData.truck_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

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

      onOrderUpdated();
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order {order.order_number}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isUpdating}
              className={getButtonStyle()}
            >
              {getButtonText()}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
