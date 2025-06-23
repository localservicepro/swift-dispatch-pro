
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Truck, 
  Plus, 
  Search, 
  Filter,
  Grid3X3,
  List
} from "lucide-react";
import { useTruckData } from "@/hooks/useTruckData";
import { TruckStatsOverview } from "@/components/truck/TruckStatsOverview";
import { TruckStatusCard } from "@/components/truck/TruckStatusCard";
import { Database } from "@/integrations/supabase/types";

type Truck = Database["public"]["Tables"]["trucks"]["Row"];
type TruckStatus = "available" | "assigned" | "maintenance" | "out_of_service";

export function TruckManagement() {
  const { 
    trucks, 
    isLoading, 
    getTruckStats, 
    updateTruckStatus,
    isUpdatingStatus 
  } = useTruckData();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [truckTypeFilter, setTruckTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const stats = getTruckStats();

  // Filter trucks based on search and filters
  const filteredTrucks = trucks.filter(truck => {
    const matchesSearch = truck.registration_number
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || truck.status === statusFilter;
    
    const matchesType = truckTypeFilter === "all" || truck.truck_type === truckTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleStatusChange = (truckId: string, status: TruckStatus) => {
    updateTruckStatus({ truckId, status });
  };

  const handleEditTruck = (truck: Truck) => {
    // TODO: Implement truck editing dialog
    console.log("Edit truck:", truck);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Truck className="w-8 h-8 animate-pulse mx-auto mb-2" />
          <p>Loading fleet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage your vehicle fleet
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Truck
        </Button>
      </div>

      {/* Stats Overview */}
      <TruckStatsOverview stats={stats} />

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by registration number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
              </SelectContent>
            </Select>

            {/* Truck Type Filter */}
            <Select value={truckTypeFilter} onValueChange={setTruckTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="small">Small Truck</SelectItem>
                <SelectItem value="medium">Medium Truck</SelectItem>
                <SelectItem value="large">Large Truck</SelectItem>
                <SelectItem value="crane">Crane Truck</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trucks Grid/List */}
      {filteredTrucks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No trucks found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" || truckTypeFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first truck to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {filteredTrucks.map((truck) => (
            <TruckStatusCard
              key={truck.id}
              truck={truck}
              onStatusChange={handleStatusChange}
              onEdit={handleEditTruck}
              isUpdating={isUpdatingStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
