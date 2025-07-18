import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LowStockProduct {
  product_id: string;
  product_name: string;
  current_stock: number;
  category_name: string;
}

interface BackOrderSummary {
  product_id: string;
  product_name: string;
  total_back_ordered: number;
  current_stock: number;
  orders_count: number;
}

interface StockAvailabilityCheck {
  product_id: string;
  product_name: string;
  requested_quantity: number;
  available_stock: number;
  is_sufficient: boolean;
}

export function useInventoryManagement() {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [backOrderSummary, setBackOrderSummary] = useState<BackOrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(10);
  const { toast } = useToast();

  // Fetch low stock products
  const fetchLowStockProducts = async (stockThreshold?: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_low_stock_products', { threshold: stockThreshold || threshold });

      if (error) throw error;
      setLowStockProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching low stock products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch low stock products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch back order summary
  const fetchBackOrderSummary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_back_order_summary');

      if (error) throw error;
      setBackOrderSummary(data || []);
    } catch (error: any) {
      console.error('Error fetching back order summary:', error);
      toast({
        title: "Error",
        description: "Failed to fetch back order summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check stock availability for order items
  const checkStockAvailability = async (orderItems: any[]): Promise<StockAvailabilityCheck[]> => {
    try {
      const { data, error } = await supabase
        .rpc('check_stock_availability', { order_items: orderItems });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error checking stock availability:', error);
      toast({
        title: "Error",
        description: "Failed to check stock availability",
        variant: "destructive",
      });
      return [];
    }
  };

  // Determine order status based on stock
  const determineOrderStatus = async (orderItems: any[]): Promise<string> => {
    try {
      const { data, error } = await supabase
        .rpc('determine_order_status', { order_items: orderItems });

      if (error) throw error;
      return data || 'requested';
    } catch (error: any) {
      console.error('Error determining order status:', error);
      return 'requested';
    }
  };

  // Manually deduct inventory (for admin use)
  const deductInventory = async (orderId: string) => {
    try {
      const { error } = await supabase
        .rpc('deduct_inventory', { order_id_param: orderId });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Inventory deducted successfully",
      });
      
      // Refresh data
      await fetchLowStockProducts();
      await fetchBackOrderSummary();
    } catch (error: any) {
      console.error('Error deducting inventory:', error);
      toast({
        title: "Error",
        description: `Failed to deduct inventory: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Manually restore inventory (for admin use)
  const restoreInventory = async (orderId: string) => {
    try {
      const { error } = await supabase
        .rpc('restore_inventory', { order_id_param: orderId });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Inventory restored successfully",
      });
      
      // Refresh data
      await fetchLowStockProducts();
      await fetchBackOrderSummary();
    } catch (error: any) {
      console.error('Error restoring inventory:', error);
      toast({
        title: "Error",
        description: `Failed to restore inventory: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Update product stock quantity
  const updateProductStock = async (productId: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Product stock updated successfully",
      });
      
      // Refresh data
      await fetchLowStockProducts();
      await fetchBackOrderSummary();
    } catch (error: any) {
      console.error('Error updating product stock:', error);
      toast({
        title: "Error",
        description: `Failed to update product stock: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Auto-refresh data
  useEffect(() => {
    fetchLowStockProducts();
    fetchBackOrderSummary();
  }, [threshold]);

  return {
    // Data
    lowStockProducts,
    backOrderSummary,
    loading,
    threshold,
    
    // Actions
    setThreshold,
    fetchLowStockProducts,
    fetchBackOrderSummary,
    checkStockAvailability,
    determineOrderStatus,
    deductInventory,
    restoreInventory,
    updateProductStock,
    
    // Computed values
    hasLowStock: lowStockProducts.length > 0,
    hasBackOrders: backOrderSummary.length > 0,
    totalBackOrderedItems: backOrderSummary.reduce((sum, item) => sum + item.total_back_ordered, 0),
    totalBackOrderedOrders: backOrderSummary.reduce((sum, item) => sum + item.orders_count, 0)
  };
}