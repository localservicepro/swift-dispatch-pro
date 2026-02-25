
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { User, AlertCircle, RefreshCw, Check, ChevronsUpDown, UserX } from "lucide-react";
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
  const [open, setOpen] = useState(false);
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

      setDrivers([...driversList, ...adminsList]);
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

  const driversList = drivers.filter(d => d.role === 'driver');
  const adminsList = drivers.filter(d => d.role === 'admin');
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  const displayValue = selectedDriverId && selectedDriverId !== "unassigned" && selectedDriver
    ? (selectedDriver.full_name || selectedDriver.email)
    : null;

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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={loadingDrivers}
            className={cn(
              "w-full justify-between font-normal bg-background",
              !displayValue && "text-muted-foreground"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              {displayValue ? (
                <>
                  <User className="w-3.5 h-3.5" />
                  {displayValue}
                  {selectedDriver && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {selectedDriver.role === 'driver' ? 'Driver' : 'Admin'}
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <UserX className="w-3.5 h-3.5" />
                  {loadingDrivers ? "Loading users..." : "No driver assigned"}
                </>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width] pointer-events-auto" align="start" onWheel={(e) => e.stopPropagation()}>
          <Command>
            <CommandInput placeholder="Search by name or email..." />
            <CommandList>
              <CommandEmpty>No user found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="no-driver-assigned"
                  onSelect={() => {
                    onDriverChange("unassigned");
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 py-2"
                >
                  <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>No driver assigned</span>
                  <Check className={cn("ml-auto h-4 w-4", (!selectedDriverId || selectedDriverId === "unassigned") ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              </CommandGroup>
              {driversList.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Drivers">
                    {driversList.map((driver) => (
                      <CommandItem
                        key={driver.id}
                        value={`${driver.full_name || ''} ${driver.email}`}
                        onSelect={() => {
                          onDriverChange(driver.id);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 py-2"
                      >
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{driver.full_name || driver.email}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Driver</Badge>
                        <Check className={cn("ml-auto h-4 w-4", selectedDriverId === driver.id ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              {adminsList.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Admins">
                    {adminsList.map((admin) => (
                      <CommandItem
                        key={admin.id}
                        value={`${admin.full_name || ''} ${admin.email}`}
                        onSelect={() => {
                          onDriverChange(admin.id);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 py-2"
                      >
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{admin.full_name || admin.email}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Admin</Badge>
                        <Check className={cn("ml-auto h-4 w-4", selectedDriverId === admin.id ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {!loadingDrivers && drivers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {driversList.length} driver(s), {adminsList.length} admin(s) available.
        </p>
      )}
    </div>
  );
}
