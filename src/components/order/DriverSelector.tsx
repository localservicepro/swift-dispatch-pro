
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { User, AlertCircle, RefreshCw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Driver {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface DriverSelectorProps {
  selectedDriverId: string;
  onDriverChange: (driverId: string) => void;
  deliveryDate?: string;
  deliveryTime?: string;
  excludeOrderId?: string;
}

export function DriverSelector({ 
  selectedDriverId, 
  onDriverChange,
}: DriverSelectorProps) {
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

      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at, updated_at, phone')
        .order('role', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;

      if (!allUsers || allUsers.length === 0) {
        setDriversError('No users available for driver assignment.');
        setDrivers([]);
        return;
      }

      const driversList = allUsers.filter(user => user.role === 'driver');
      const adminsList = allUsers.filter(user => user.role === 'admin');

      const sortedUsers = [...driversList, ...adminsList].sort((a, b) => {
        if (a.role === 'driver' && b.role === 'admin') return -1;
        if (a.role === 'admin' && b.role === 'driver') return 1;
        return (a.full_name || a.email).localeCompare(b.full_name || b.email);
      });

      setDrivers(sortedUsers);
    } catch (error: any) {
      console.error('Failed to load users in driver selector:', error);
      setDriversError('Failed to load available users. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load available users",
        variant: "destructive",
      });
    } finally {
      setLoadingDrivers(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="driver" className="flex items-center gap-2">
        <User className="w-4 h-4" />
        Assign Driver
        {!loadingDrivers && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadDrivers()}
            className="ml-auto h-6 w-6 p-0"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </Label>
      
      {driversError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <p className="text-sm text-destructive">{driversError}</p>
        </div>
      )}

      <div className="border border-input rounded-md">
        <ScrollArea className="h-[250px]">
          <div className="p-1">
            {loadingDrivers ? (
              <p className="text-sm text-muted-foreground p-3">Loading users...</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onDriverChange("unassigned")}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-sm transition-colors flex items-center justify-between",
                    selectedDriverId === "unassigned" || !selectedDriverId
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span>No driver assigned</span>
                  {(selectedDriverId === "unassigned" || !selectedDriverId) && <Check className="w-4 h-4" />}
                </button>
                <div className="mx-2 my-1 h-px bg-border" />
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => onDriverChange(driver.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-sm transition-colors flex items-center justify-between",
                      selectedDriverId === driver.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{driver.full_name || driver.email}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        selectedDriverId === driver.id
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : driver.role === 'driver' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                      )}>
                        {driver.role}
                      </span>
                    </div>
                    {selectedDriverId === driver.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {!loadingDrivers && drivers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {drivers.filter(d => d.role === 'driver').length} driver(s), {drivers.filter(d => d.role === 'admin').length} admin(s) available.
        </p>
      )}
    </div>
  );
}
