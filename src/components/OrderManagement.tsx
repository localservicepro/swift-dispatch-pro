
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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

  const handleCreateOrder = () => {
    if (!newOrder.customer || !newOrder.products || !newOrder.total) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const order: Order = {
      id: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
      customer: newOrder.customer,
      products: newOrder.products.split(',').map(p => p.trim()),
      total: parseFloat(newOrder.total),
      status: "Preparing",
      driver: newOrder.driver || "Not Assigned",
      date: new Date().toISOString().split('T')[0]
    };

    setOrders([...orders, order]);
    setNewOrder({ customer: "", products: "", total: "", driver: "", customerType: "regular" });
    setIsCreating(false);
    
    toast({
      title: "Success",
      description: "Order created successfully!",
    });
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
