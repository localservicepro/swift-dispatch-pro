import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

interface UseAccountStatementExportProps {
  customerId: string;
}

export function useAccountStatementExport({ customerId }: UseAccountStatementExportProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const dateRange = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd'T'23:59:59"),
    };
  }, [selectedMonth]);

  // Fetch preview data (order count and total) - delivered + back_order, but only delivered in totals
  const { data: previewData, isLoading: isLoadingPreview } = useQuery({
    queryKey: ["account-statement-preview", customerId, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_amount, payment_status, delivery_date, pickup_date, delivery_method, status, created_at")
        .eq("customer_id", customerId)
        .in("status", ["delivered", "back_order", "pickup_complete"])
        .is("deleted_at", null);

      if (error) throw error;

      // Filter by fulfilment date with fallback across pickup/delivery/created_at
      const filteredData = data?.filter(order => {
        const primary = order.delivery_method === 'pickup' ? order.pickup_date : order.delivery_date;
        const orderDate = primary ?? order.delivery_date ?? order.pickup_date ?? order.created_at;
        return orderDate && orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
      }) || [];

      const orderCount = filteredData.length;
      
      // Only count delivered orders in financial totals (exclude back_order)
      const deliveredOrders = filteredData.filter(o => o.status === 'delivered');
      const totalAmount = deliveredOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
      const paidAmount = deliveredOrders.filter(o => o.payment_status === "paid")
        .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
      const pendingAmount = totalAmount - paidAmount;

      return {
        orderCount,
        totalAmount,
        paidAmount,
        pendingAmount,
      };
    },
    enabled: !!customerId,
  });

  const setThisMonth = () => {
    setSelectedMonth(new Date());
  };

  const setLastMonth = () => {
    setSelectedMonth(subMonths(new Date(), 1));
  };

  const generateStatement = async () => {
    if (!customerId) {
      toast({
        title: "Error",
        description: "Customer ID is required",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await supabase.functions.invoke("generate-account-statement", {
        body: {
          customerId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate statement");
      }

      const { downloadUrl, filename, orderCount } = response.data;

      if (!downloadUrl) {
        throw new Error("No download URL returned");
      }

      // Open in new window for printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        // Decode base64 HTML
        const base64Data = downloadUrl.split(",")[1];
        const htmlContent = atob(base64Data);
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then trigger print
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      toast({
        title: "Statement Generated",
        description: `Statement with ${orderCount} orders opened for printing`,
      });
    } catch (error: any) {
      console.error("Error generating statement:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate statement",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    selectedMonth,
    setSelectedMonth,
    setThisMonth,
    setLastMonth,
    dateRange,
    previewData,
    isLoadingPreview,
    isGenerating,
    generateStatement,
  };
}
