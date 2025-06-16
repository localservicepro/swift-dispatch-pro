
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { DriverSelector } from "./DriverSelector";
import { SuburbSelector } from "./SuburbSelector";
import { useQuery } from "@tanstack/react-query";

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

interface Truck {
  id: string;
  registration_number: string;
  truck_type: TruckType;
  status: string;
  capacity_tons: number | null;
}

interface OrderEditDialogProps {
  order: Order;
  onOrderUpdated: () => void;
  onClose: () => void;
}

export function OrderEditDialog({ order, onOrderUpdated, onClose }: OrderEditDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: order.customer_name,
    customer_phone: order.customer_phone || '',
    customer_address: order.customer_address,
    total_amount: order.total_amount.toString(),
    status: order.status,
    delivery_date: order.delivery_date || '',
    delivery_time: order.delivery_time || '',
    special_instructions: order.special_instructions || '',
    driver_id: order.driver_id || 'unassigned',
    suburb_id: order.suburb_id || '',
    delivery_fee: order.delivery_fee || 0,
    subtotal: order.subtotal || (order.total_amount - (order.delivery_fee || 0)),
    truck_type: order.truck_type || '',
    truck_id: order.truck_id || '',
  });
  const { toast } = useToast();

  // Fetch available trucks based on selected truck type
  const { data: availableTrucks = [] } = useQuery({
    queryKey: ['available-trucks', formData.truck_type],
    queryFn: async () => {
      if (!formData.truck_type) return [];
      
      const { data, error } = await supabase
        .from('trucks')
        .select('id, registration_number, truck_type, status, capacity_tons')
        .eq('truck_type', formData.truck_type)
        .eq('is_active', true)
        .order('registration_number');

      if (error) throw error;
      return data;
    },
    enabled: !!formData.truck_type,
  });

  // Reset truck selection when truck type changes
  useEffect(() => {
    if (formData.truck_type !== order.truck_type) {
      setFormData(prev => ({ ...prev, truck_id: '' }));
    }
  }, [formData.truck_type, order.truck_type]);

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
        if (formData.truck_id) {
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
          truck_type: formData.truck_type || null,
          truck_id: formData.truck_id || null,
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDriverChange = (driverId: string) => {
    setFormData(prev => ({
      ...prev,
      driver_id: driverId
    }));
  };

  const handleSuburbChange = (suburbId: string, deliveryRate: number) => {
    const newSubtotal = parseFloat(formData.total_amount) - formData.delivery_fee;
    const newTotalAmount = newSubtotal + deliveryRate;
    
    setFormData(prev => ({
      ...prev,
      suburb_id: suburbId,
      delivery_fee: deliveryRate,
      total_amount: newTotalAmount.toString(),
      subtotal: newSubtotal,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'out_of_service': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order {order.order_number}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => handleInputChange('customer_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="customer_phone">Customer Phone</Label>
              <Input
                id="customer_phone"
                value={formData.customer_phone}
                onChange={(e) => handleInputChange('customer_phone', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="customer_address">Customer Address</Label>
            <Textarea
              id="customer_address"
              value={formData.customer_address}
              onChange={(e) => handleInputChange('customer_address', e.target.value)}
              required
            />
          </div>

          <div>
            <SuburbSelector
              selectedSuburbId={formData.suburb_id}
              onSuburbChange={handleSuburbChange}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={formData.subtotal.toString()}
                onChange={(e) => handleInputChange('subtotal', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="delivery_fee">Delivery Fee</Label>
              <Input
                id="delivery_fee"
                type="number"
                step="0.01"
                value={formData.delivery_fee.toString()}
                readOnly
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="total_amount">Total Amount</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                value={formData.total_amount}
                readOnly
                className="bg-gray-100"
              />
            </div>
          </div>

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

          {/* Truck Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="truck_type">Truck Type</Label>
              <Select value={formData.truck_type} onValueChange={(value) => handleInputChange('truck_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select truck type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No truck assigned</SelectItem>
                  <SelectItem value="small">Small Truck</SelectItem>
                  <SelectItem value="medium">Medium Truck</SelectItem>
                  <SelectItem value="large">Large Truck</SelectItem>
                  <SelectItem value="crane">Crane Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.truck_type && (
              <div>
                <Label htmlFor="truck_id">Specific Truck</Label>
                <Select value={formData.truck_id} onValueChange={(value) => handleInputChange('truck_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specific truck" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific truck</SelectItem>
                    {availableTrucks.map((truck) => (
                      <SelectItem 
                        key={truck.id} 
                        value={truck.id}
                        disabled={truck.status !== 'available' && truck.id !== order.truck_id}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{truck.registration_number}</span>
                          <Badge className={`ml-2 ${getStatusColor(truck.status)}`}>
                            {truck.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <DriverSelector
              selectedDriverId={formData.driver_id}
              onDriverChange={handleDriverChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="delivery_date">Delivery Date</Label>
              <Input
                id="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={(e) => handleInputChange('delivery_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="delivery_time">Delivery Time</Label>
              <Input
                id="delivery_time"
                type="time"
                value={formData.delivery_time}
                onChange={(e) => handleInputChange('delivery_time', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="special_instructions">Special Instructions</Label>
            <Textarea
              id="special_instructions"
              value={formData.special_instructions}
              onChange={(e) => handleInputChange('special_instructions', e.target.value)}
              placeholder="Any special delivery instructions..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
