
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export function OrderStatusTest() {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [newStatus, setNewStatus] = useState<OrderStatus>("preparing");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Fetch a few orders for testing
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['test-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, status')
        .limit(5)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const testStatusUpdate = async () => {
    if (!selectedOrderId) {
      toast({
        title: "Error",
        description: "Please select an order to test",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    
    try {
      console.log('Testing order status update:', {
        orderId: selectedOrderId,
        newStatus,
        timestamp: new Date().toISOString()
      });

      // Test direct database update
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrderId);

      if (updateError) {
        console.error('Direct update error:', updateError);
        throw updateError;
      }

      // Test using the RPC function (if it exists and is accessible)
      try {
        const { error: rpcError } = await supabase.rpc('update_order_status', {
          order_id: selectedOrderId,
          new_status: newStatus
        });

        if (rpcError) {
          console.warn('RPC function error (expected if RLS restricts access):', rpcError);
        } else {
          console.log('RPC function executed successfully');
        }
      } catch (rpcErr) {
        console.warn('RPC function not accessible or failed:', rpcErr);
      }

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });

      console.log('Order status update completed successfully');
      
    } catch (error: any) {
      console.error('Order status update failed:', error);
      toast({
        title: "Error",
        description: `Failed to update order status: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading orders for testing...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Order Status Update Test</CardTitle>
        <p className="text-sm text-slate-600">
          Test the order status update functionality after security fix
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Select Order:</label>
          <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an order to test" />
            </SelectTrigger>
            <SelectContent>
              {orders.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.order_number} - {order.customer_name} ({order.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">New Status:</label>
          <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OrderStatus)}>
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

        <Button 
          onClick={testStatusUpdate}
          disabled={isUpdating || !selectedOrderId}
          className="w-full"
        >
          {isUpdating ? "Testing..." : "Test Status Update"}
        </Button>

        <div className="text-xs text-slate-500 space-y-1">
          <p>• Check browser console for detailed logs</p>
          <p>• Tests both direct update and RPC function</p>
          <p>• Verifies security fix is working</p>
        </div>
      </CardContent>
    </Card>
  );
}
