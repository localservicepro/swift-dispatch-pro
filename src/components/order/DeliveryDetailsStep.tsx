import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Truck, User, AlertCircle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface Driver {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface DeliveryDetailsStepProps {
  deliveryDate: string;
  deliveryTime: string;
  truckType: TruckType | "";
  driverId: string;
  specialInstructions: string;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryTimeChange: (time: string) => void;
  onTruckTypeChange: (truckType: TruckType | "") => void;
  onDriverChange: (driverId: string) => void;
  onSpecialInstructionsChange: (instructions: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DeliveryDetailsStep({
  deliveryDate,
  deliveryTime,
  truckType,
  driverId,
  specialInstructions,
  onDeliveryDateChange,
  onDeliveryTimeChange,
  onTruckTypeChange,
  onDriverChange,
  onSpecialInstructionsChange,
  onBack,
  onNext
}: DeliveryDetailsStepProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [driversError, setDriversError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setLoadingDrivers(true);
      setDriversError(null);

      // First try to get users with driver role
      let { data: driverUsers, error: driverError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'driver')
        .order('full_name');

      if (driverError) {
        console.error('Error loading drivers:', driverError);
        throw driverError;
      }

      // If no drivers found, also include admin users as potential drivers
      if (!driverUsers || driverUsers.length === 0) {
        console.log('No dedicated drivers found, including admin users as potential drivers');
        const { data: adminUsers, error: adminError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('role', 'admin')
          .order('full_name');

        if (adminError) {
          console.error('Error loading admin users:', adminError);
          throw adminError;
        }

        driverUsers = adminUsers || [];
      }

      console.log('Loaded drivers/users:', driverUsers);
      setDrivers(driverUsers || []);

      if (!driverUsers || driverUsers.length === 0) {
        setDriversError('No users available for driver assignment. Please create some user accounts first.');
      }

    } catch (error: any) {
      console.error('Failed to load drivers:', error);
      setDriversError('Failed to load available drivers. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load available drivers",
        variant: "destructive",
      });
    } finally {
      setLoadingDrivers(false);
    }
  };

  // Generate time slots (8 AM to 6 PM)
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      timeSlots.push({ value: time, label: displayTime });
    }
  }

  const truckTypes: { value: TruckType; label: string; description: string }[] = [
    { value: 'small', label: 'Small Truck', description: 'Up to 3 tons - Local deliveries' },
    { value: 'medium', label: 'Medium Truck', description: 'Up to 8 tons - Regional deliveries' },
    { value: 'large', label: 'Large Truck', description: 'Up to 15 tons - Long distance' },
    { value: 'refrigerated', label: 'Refrigerated Truck', description: 'Temperature controlled cargo' }
  ];

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Step 3: Delivery Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Delivery Date */}
          <div className="space-y-2">
            <Label htmlFor="delivery_date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Delivery Date *
            </Label>
            <Input
              id="delivery_date"
              type="date"
              value={deliveryDate}
              onChange={(e) => onDeliveryDateChange(e.target.value)}
              min={getTomorrowDate()}
            />
          </div>

          {/* Delivery Time */}
          <div className="space-y-2">
            <Label htmlFor="delivery_time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Delivery Time *
            </Label>
            <Select value={deliveryTime} onValueChange={onDeliveryTimeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Truck Type */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Truck Type *
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {truckTypes.map((truck) => (
              <div
                key={truck.value}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  truckType === truck.value 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onTruckTypeChange(truck.value)}
              >
                <div className="font-medium">{truck.label}</div>
                <div className="text-sm text-gray-600">{truck.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Driver Assignment */}
        <div className="space-y-2">
          <Label htmlFor="driver" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Assign Driver
          </Label>
          
          {driversError && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">{driversError}</p>
            </div>
          )}

          <Select value={driverId} onValueChange={onDriverChange} disabled={loadingDrivers}>
            <SelectTrigger>
              <SelectValue placeholder={loadingDrivers ? "Loading drivers..." : "Select driver (optional)"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">No driver assigned</SelectItem>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  <div className="flex items-center gap-2">
                    <span>{driver.full_name || driver.email}</span>
                    <span className="text-xs text-gray-500 capitalize">({driver.role})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!loadingDrivers && drivers.length === 0 && (
            <p className="text-sm text-gray-600">
              No drivers available. Orders will be created without driver assignment.
            </p>
          )}
        </div>

        {/* Special Instructions */}
        <div className="space-y-2">
          <Label htmlFor="instructions">Special Delivery Instructions</Label>
          <Textarea
            id="instructions"
            placeholder="Any special instructions for the delivery..."
            value={specialInstructions}
            onChange={(e) => onSpecialInstructionsChange(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={onNext}
            disabled={!deliveryDate || !deliveryTime || !truckType}
            className="ml-auto"
          >
            Review Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
