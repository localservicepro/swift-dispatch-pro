
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useCustomerActions() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleViewOrders = (customer: any) => {
    setSelectedCustomer(customer);
    setShowOrders(true);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;

      toast({
        title: "Customer Deleted",
        description: "Customer has been successfully deleted."
      });
      
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDialogSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["customers-paginated"] });
    queryClient.invalidateQueries({ queryKey: ["customers-stats-counts"] });
    queryClient.invalidateQueries({ queryKey: ["customer_contacts"] });
    setIsDialogOpen(false);
  };

  return {
    isDialogOpen,
    selectedCustomer,
    isEditMode,
    showOrders,
    setIsDialogOpen,
    setShowOrders,
    handleAddCustomer,
    handleEditCustomer,
    handleViewOrders,
    handleDeleteCustomer,
    handleDialogSuccess
  };
}
