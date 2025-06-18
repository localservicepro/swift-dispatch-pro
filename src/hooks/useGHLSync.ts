
import { useEffect } from "react";
import { ghlService } from "@/utils/ghlService";
import { useToast } from "@/hooks/use-toast";

export function useGHLSync() {
  const { toast } = useToast();

  const syncCustomer = async (customer: any) => {
    try {
      const settings = await ghlService.getSettings();
      // Check if settings is an object and has the required properties
      if (settings && typeof settings === 'object' && 'auto_sync_customers' in settings && 'connection_status' in settings) {
        if (settings.auto_sync_customers && settings.connection_status === 'connected') {
          await ghlService.syncCustomer(customer);
          console.log('Customer synced to GHL successfully');
        }
      }
    } catch (error) {
      console.error('Failed to sync customer to GHL:', error);
      toast({
        title: "Sync Warning",
        description: "Customer saved but failed to sync to GoHighLevel",
        variant: "destructive",
      });
    }
  };

  const syncOrder = async (order: any) => {
    try {
      const settings = await ghlService.getSettings();
      // Check if settings is an object and has the required properties
      if (settings && typeof settings === 'object' && 'auto_sync_orders' in settings && 'connection_status' in settings) {
        if (settings.auto_sync_orders && settings.connection_status === 'connected') {
          await ghlService.syncOrder(order);
          console.log('Order synced to GHL successfully');
        }
      }
    } catch (error) {
      console.error('Failed to sync order to GHL:', error);
      toast({
        title: "Sync Warning",
        description: "Order saved but failed to sync to GoHighLevel",
        variant: "destructive",
      });
    }
  };

  return {
    syncCustomer,
    syncOrder
  };
}
