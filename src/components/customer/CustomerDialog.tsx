import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { useGHLSync } from "@/hooks/useGHLSync";

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
  customerType: z.enum(["trade", "account"]),
  suburbId: z.string().uuid({
    message: "Please select a valid suburb.",
  }),
  paymentTerms: z.string().min(2, {
    message: "Payment terms must be at least 2 characters.",
  }),
  creditLimit: z.number().optional(),
  autoInvoice: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

interface CustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  isEditMode: boolean;
  onSuccess: () => void;
}

export function CustomerDialog({ isOpen, onClose, customer, isEditMode, onSuccess }: CustomerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { syncCustomer } = useGHLSync();

  const { data: suburbs, isLoading, error } = useQuery({
    queryKey: ["suburbs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suburbs")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: customer?.first_name || "",
      lastName: customer?.last_name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      address: customer?.full_address || "",
      customerType: customer?.customer_type || "trade",
      suburbId: customer?.suburbs?.id || "",
      paymentTerms: customer?.billing_preferences?.payment_terms || "",
      creditLimit: customer?.billing_preferences?.credit_limit || 0,
      autoInvoice: customer?.billing_preferences?.auto_invoice || false,
      isActive: customer?.is_active || true,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        firstName: customer.first_name || "",
        lastName: customer.last_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.full_address || "",
        customerType: customer.customer_type || "trade",
        suburbId: customer.suburbs?.id || "",
        paymentTerms: customer.billing_preferences?.payment_terms || "",
        creditLimit: customer.billing_preferences?.credit_limit || 0,
        autoInvoice: customer.billing_preferences?.auto_invoice || false,
        isActive: customer.is_active || true,
      });
    }
  }, [customer, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const customerData = {
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phone: values.phone || null,
        full_address: values.address,
        customer_type: values.customerType,
        suburb_id: values.suburbId,
        billing_preferences: {
          payment_terms: values.paymentTerms,
          credit_limit: values.creditLimit || 0,
          auto_invoice: values.autoInvoice
        },
        is_active: values.isActive
      };

      let result;
      if (isEditMode && customer) {
        const { data, error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", customer.id)
          .select(`
            *,
            suburbs (
              id,
              name,
              state,
              postcode,
              delivery_rate
            )
          `)
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert(customerData)
          .select(`
            *,
            suburbs (
              id,
              name,
              state,
              postcode,
              delivery_rate
            )
          `)
          .single();
        
        if (error) throw error;
        result = data;
      }

      // Sync to GoHighLevel if enabled
      try {
        await syncCustomer(result);
      } catch (error) {
        console.error('GHL sync failed:', error);
        // Don't fail the whole operation if GHL sync fails
      }

      toast({
        title: isEditMode ? "Customer Updated" : "Customer Created",
        description: `${values.firstName} ${values.lastName} has been ${isEditMode ? 'updated' : 'added'} successfully.`,
      });

      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Make changes to the customer details here. Click save when you're done."
              : "Create a new customer by entering their details below."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, City, State, ZIP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="trade">Trade</SelectItem>
                        <SelectItem value="account">Account</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="suburbId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a suburb" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suburbs?.map((suburb) => (
                          <SelectItem key={suburb.id} value={suburb.id}>
                            {suburb.name}, {suburb.state} {suburb.postcode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <FormControl>
                      <Input placeholder="Net 30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Limit (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="autoInvoice"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Auto Invoice</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Active</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
