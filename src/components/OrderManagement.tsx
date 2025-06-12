
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  const [newOrder, setNewOrder] = useState({
    customer: "",
    products: "",
    total: "",
    driver: "",
    customerType: "regular"
  });
  const { toast } = useToast();

  const handleCreateOrder = async () => {
    if (!newOrder.customer || !newOrder.products || !newOrder.total) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create orders",
          variant: "destructive",
        });
        return;
      }

      // Get admin profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        toast({
          title: "Error",
          description: "Only admins can create orders",
          variant: "destructive",
        });
        return;
      }

      // Get driver ID if assigned
      let driverId = null;
      if (newOrder.driver && newOrder.driver !== "Not Assigned") {
        const { data: driverProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('full_name', newOrder.driver)
          .eq('role', 'driver')
          .single();
        
        if (driverProfile) {
          driverId = driverProfile.id;
        }
      }

      const orderData = {
        order_number: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
        customer_name: newOrder.customer,
        customer_address: "123 Main St", // You might want to add an address field
        products: newOrder.products.split(',').map(p => p.trim()),
        total_amount: parseFloat(newOrder.total),
        driver_id: driverId,
        admin_id: user.id,
        status: 'preparing' as OrderStatus
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      // Add to local state for immediate UI update
      const newOrderLocal: Order = {
        id: data.order_number,
        customer: data.customer_name,
        products: Array.isArray(data.products) ? 
          data.products.map(p => typeof p === 'string' ? p : String(p)) : 
          [String(data.products)],
        total: data.total_amount,
        status: data.status === 'preparing' ? 'Preparing' : data.status,
        driver: newOrder.driver || "Not Assigned",
        date: new Date().toISOString().split('T')[0]
      };

      setOrders([...orders, newOrderLocal]);
      setNewOrder({ customer: "", products: "", total: "", driver: "", customerType: "regular" });
      setIsCreating(false);
      
      toast({
        title: "Success",
        description: "Order created successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    }
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

      {isCreating && (
        <Card className="border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="text-blue-800">Create New Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">Customer Name *</Label>
                <Input
                  id="customer"
                  value={newOrder.customer}
                  onChange={(e) => setNewOrder({...newOrder, customer: e.target.value})}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="customerType">Customer Type</Label>
                <Select value={newOrder.customerType} onValueChange={(value) => setNewOrder({...newOrder, customerType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="products">Products *</Label>
              <Input
                id="products"
                value={newOrder.products}
                onChange={(e) => setNewOrder({...newOrder, products: e.target.value})}
                placeholder="Enter products (comma separated)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total">Total Amount *</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  value={newOrder.total}
                  onChange={(e) => setNewOrder({...newOrder, total: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="driver">Assign Driver</Label>
                <Select value={newOrder.driver} onValueChange={(value) => setNewOrder({...newOrder, driver: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
                    <SelectItem value="Sarah Wilson">Sarah Wilson</SelectItem>
                    <SelectItem value="Tom Davis">Tom Davis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCreateOrder} className="bg-green-600 hover:bg-green-700">
                Create Order
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
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
