
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  currentDeliveries: number;
  totalDeliveries: number;
  rating: number;
}

const mockDrivers: Driver[] = [
  { id: "DRV-001", name: "Mike Johnson", email: "mike@company.com", phone: "+1234567890", status: "active", currentDeliveries: 3, totalDeliveries: 245, rating: 4.8 },
  { id: "DRV-002", name: "Sarah Wilson", email: "sarah@company.com", phone: "+1234567891", status: "active", currentDeliveries: 2, totalDeliveries: 189, rating: 4.9 },
  { id: "DRV-003", name: "Tom Davis", email: "tom@company.com", phone: "+1234567892", status: "inactive", currentDeliveries: 0, totalDeliveries: 156, rating: 4.6 },
];

export function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>(mockDrivers);
  const [isAdding, setIsAdding] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const { toast } = useToast();

  const handleAddDriver = () => {
    if (!newDriver.name || !newDriver.email || !newDriver.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const driver: Driver = {
      id: `DRV-${String(drivers.length + 1).padStart(3, '0')}`,
      name: newDriver.name,
      email: newDriver.email,
      phone: newDriver.phone,
      status: "active",
      currentDeliveries: 0,
      totalDeliveries: 0,
      rating: 5.0
    };

    setDrivers([...drivers, driver]);
    setNewDriver({ name: "", email: "", phone: "" });
    setIsAdding(false);
    
    toast({
      title: "Success",
      description: "Driver added successfully!",
    });
  };

  const toggleDriverStatus = (driverId: string) => {
    setDrivers(drivers.map(driver => 
      driver.id === driverId 
        ? { ...driver, status: driver.status === "active" ? "inactive" : "active" as const }
        : driver
    ));
    
    toast({
      title: "Driver Status Updated",
      description: "Driver status has been changed successfully",
    });
  };

  const deleteDriver = (driverId: string) => {
    setDrivers(drivers.filter(driver => driver.id !== driverId));
    toast({
      title: "Driver Removed",
      description: "Driver has been removed from the system",
    });
  };

  const assignDelivery = (driverId: string) => {
    setDrivers(drivers.map(driver => 
      driver.id === driverId 
        ? { ...driver, currentDeliveries: driver.currentDeliveries + 1 }
        : driver
    ));
    
    toast({
      title: "Delivery Assigned",
      description: "New delivery has been assigned to the driver",
    });
  };

  const getStatusColor = (status: string) => {
    return status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Driver Management</h2>
          <p className="text-slate-600 mt-1">Manage your delivery team and assignments</p>
        </div>
        <Button 
          onClick={() => setIsAdding(true)} 
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
        >
          Add New Driver
        </Button>
      </div>

      {/* Driver Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{drivers.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Active Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {drivers.filter(d => d.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Current Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {drivers.reduce((sum, d) => sum + d.currentDeliveries, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {(drivers.reduce((sum, d) => sum + d.rating, 0) / drivers.length).toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdding && (
        <Card className="border-indigo-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100">
            <CardTitle className="text-indigo-800">Add New Driver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="driverName">Driver Name *</Label>
                <Input
                  id="driverName"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                  placeholder="Enter driver name"
                />
              </div>
              <div>
                <Label htmlFor="driverEmail">Email *</Label>
                <Input
                  id="driverEmail"
                  type="email"
                  value={newDriver.email}
                  onChange={(e) => setNewDriver({...newDriver, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="driverPhone">Phone Number *</Label>
              <Input
                id="driverPhone"
                value={newDriver.phone}
                onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleAddDriver} className="bg-indigo-600 hover:bg-indigo-700">
                Add Driver
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver List */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Driver Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {drivers.map((driver) => (
              <div key={driver.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-800">{driver.name}</h3>
                    <Badge className={getStatusColor(driver.status)}>
                      {driver.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-sm text-slate-500">Rating: {driver.rating}/5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Active:</span>
                    <Switch
                      checked={driver.status === "active"}
                      onCheckedChange={() => toggleDriverStatus(driver.id)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="font-medium">{driver.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Phone</p>
                    <p className="font-medium">{driver.phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Current Deliveries</p>
                    <p className="font-medium">{driver.currentDeliveries}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Deliveries</p>
                    <p className="font-medium">{driver.totalDeliveries}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => assignDelivery(driver.id)}
                    disabled={driver.status === "inactive"}
                  >
                    Assign Delivery
                  </Button>
                  <Button size="sm" variant="outline">Edit</Button>
                  <Button size="sm" variant="outline">View History</Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => deleteDriver(driver.id)}
                  >
                    Remove
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
