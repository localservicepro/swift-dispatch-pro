
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Truck, 
  Calendar, 
  Wrench, 
  AlertTriangle,
  MapPin,
  Edit,
  Trash
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { getTruckInfo } from "@/utils/truckUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Truck = Database["public"]["Tables"]["trucks"]["Row"];
type TruckStatus = "available" | "assigned" | "maintenance" | "out_of_service";

interface TruckStatusCardProps {
  truck: Truck;
  onStatusChange: (truckId: string, status: TruckStatus) => void;
  onEdit: (truck: Truck) => void;
  onRemove: (truck: Truck) => void;
  isUpdating?: boolean;
}

export function TruckStatusCard({ 
  truck, 
  onStatusChange, 
  onEdit,
  onRemove,
  isUpdating = false 
}: TruckStatusCardProps) {
  const truckInfo = getTruckInfo(truck.truck_type);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'out_of_service':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <Truck className="w-4 h-4" />;
      case 'assigned':
        return <MapPin className="w-4 h-4" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4" />;
      case 'out_of_service':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Truck className="w-4 h-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {truck.registration_number}
          </CardTitle>
          <Badge 
            variant="secondary" 
            className={`${getStatusColor(truck.status)} flex items-center gap-1`}
          >
            {getStatusIcon(truck.status)}
            {formatStatus(truck.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Truck Type Info */}
        {truckInfo && (
          <div className={`flex items-center gap-2 p-2 rounded-lg ${truckInfo.bgClass}`}>
            <truckInfo.icon className={`w-4 h-4 ${truckInfo.colorClass}`} />
            <div>
              <p className={`font-medium ${truckInfo.colorClass}`}>
                {truckInfo.label}
              </p>
              <p className={`text-sm ${truckInfo.colorClass} opacity-75`}>
                {truckInfo.capacity}
              </p>
            </div>
          </div>
        )}

        {/* Truck Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Capacity</p>
            <p className="font-medium">{truck.capacity_tons || "N/A"} tons</p>
          </div>
          <div>
            <p className="text-muted-foreground">Fuel</p>
            <p className="font-medium">{truck.fuel_type || "N/A"}</p>
          </div>
        </div>

        {/* Maintenance Info */}
        {truck.next_maintenance_due && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
            <Calendar className="w-4 h-4 text-yellow-600" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Next Maintenance</p>
              <p className="text-yellow-600">
                {new Date(truck.next_maintenance_due).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Status Change */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Change Status</label>
          <Select
            value={truck.status}
            onValueChange={(value) => onStatusChange(truck.id, value as TruckStatus)}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="out_of_service">Out of Service</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={() => onEdit(truck)} 
            className="flex-1"
            disabled={isUpdating}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Details
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onRemove(truck)}
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={isUpdating}
          >
            <Trash className="w-4 h-4 mr-2" />
            Remove
          </Button>
        </div>

        {/* Notes */}
        {truck.notes && (
          <div className="p-2 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{truck.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
