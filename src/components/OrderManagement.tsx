
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MultiStepOrderForm } from "./order/MultiStepOrderForm";
import { DriverAssignmentDebug } from "./DriverAssignmentDebug";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  customer: string;
  products: string[];
  total: number;
  status: string;
  driver: string;
  date: string;
}

const mockOrders: Order[] = [
  { id: "ORD-001", customer: "John Doe", products: ["Coffee", "Pastry"], total: 25.50, status: "Delivered", driver: "Mike Johnson", date: "2024-01-15" },
  { id: "ORD-002", customer: "Jane Smith", products: ["Tea", "Sandwich"], total: 18.75, status: "In Transit", driver: "Sarah Wilson", date: "2024-01-15" },
  { id: "ORD-003", customer: "Bob Brown", products: ["Juice", "Salad"], total: 22.00, status: "Preparing", driver: "Not Assigned", date: "2024-01-15" },
];

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleOrderCreated = () => {
    // Refresh orders list - in a real app you'd reload from the database
    toast({
      title: "Success",
      description: "Order created successfully!",
    });
    // You could reload orders here with a proper fetch
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered": return "bg-green-100 text-green-800";
      case "In Transit": return "bg-blue-100 text-blue-800";
      case "Preparing": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Order Management</h2>
          <p className="text-slate-600 mt-1">Create and manage customer orders</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)} 
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          Create New Order
        </Button>
      </div>

      {/* Debug Component */}
      <DriverAssignmentDebug />

      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Order</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                >
                  Close
                </Button>
              </div>
              <MultiStepOrderForm
                onOrderCreated={handleOrderCreated}
                onClose={() => setIsCreating(false)}
              />
            </div>
          </div>
        </div>
      )}

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-800">{order.id}</h3>
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                  </div>
                  <span className="text-lg font-bold text-green-600">${order.total.toFixed(2)}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Customer</p>
                    <p className="font-medium">{order.customer}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Products</p>
                    <p className="font-medium">{order.products.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Driver</p>
                    <p className="font-medium">{order.driver}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline">Edit</Button>
                  <Button size="sm" variant="outline">Track</Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
