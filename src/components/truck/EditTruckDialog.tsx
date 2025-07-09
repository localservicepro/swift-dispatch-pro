
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type Truck = Database["public"]["Tables"]["trucks"]["Row"];
type TruckUpdate = Database["public"]["Tables"]["trucks"]["Update"];

const editTruckSchema = z.object({
  registration_number: z.string().min(1, "Registration number is required"),
  truck_type: z.enum(["small", "medium", "large", "crane"]),
  capacity_tons: z.number().optional(),
  fuel_type: z.string().optional(),
  year_manufactured: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  last_maintenance_date: z.date().optional(),
  next_maintenance_due: z.date().optional(),
  notes: z.string().optional(),
});

type EditTruckFormData = z.infer<typeof editTruckSchema>;

interface EditTruckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTruck: (truckId: string, updates: TruckUpdate) => void;
  truck: Truck | null;
  isLoading: boolean;
}

export function EditTruckDialog({ open, onOpenChange, onUpdateTruck, truck, isLoading }: EditTruckDialogProps) {
  const form = useForm<EditTruckFormData>({
    resolver: zodResolver(editTruckSchema),
    defaultValues: {
      registration_number: "",
      truck_type: "small",
      fuel_type: "diesel",
    },
  });

  // Update form when truck data changes
  useEffect(() => {
    if (truck && open) {
      form.reset({
        registration_number: truck.registration_number,
        truck_type: truck.truck_type,
        capacity_tons: truck.capacity_tons || undefined,
        fuel_type: truck.fuel_type || "diesel",
        year_manufactured: truck.year_manufactured || undefined,
        last_maintenance_date: truck.last_maintenance_date ? new Date(truck.last_maintenance_date) : undefined,
        next_maintenance_due: truck.next_maintenance_due ? new Date(truck.next_maintenance_due) : undefined,
        notes: truck.notes || "",
      });
    }
  }, [truck, open, form]);

  const handleSubmit = (data: EditTruckFormData) => {
    if (!truck) return;

    const updates: TruckUpdate = {
      registration_number: data.registration_number.toUpperCase(),
      truck_type: data.truck_type,
      capacity_tons: data.capacity_tons || null,
      fuel_type: data.fuel_type || "diesel",
      year_manufactured: data.year_manufactured || null,
      last_maintenance_date: data.last_maintenance_date ? format(data.last_maintenance_date, "yyyy-MM-dd") : null,
      next_maintenance_due: data.next_maintenance_due ? format(data.next_maintenance_due, "yyyy-MM-dd") : null,
      notes: data.notes || null,
    };

    onUpdateTruck(truck.id, updates);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Truck Details</DialogTitle>
          <DialogDescription>
            Update the truck information below. Registration number and truck type are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="registration_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., ABC123" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="truck_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Truck Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select truck type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="small">Small Truck (Up to 3 tons)</SelectItem>
                      <SelectItem value="medium">Medium Truck (Up to 8 tons)</SelectItem>
                      <SelectItem value="large">Large Truck (Up to 15 tons)</SelectItem>
                      <SelectItem value="crane">Crane Truck (Specialized)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity_tons"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (tons)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 5" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fuel_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuel Type</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., diesel, petrol" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year_manufactured"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year Manufactured</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 2020" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_maintenance_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Last Maintenance Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="next_maintenance_due"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Next Maintenance Due</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about the truck..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Truck"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
