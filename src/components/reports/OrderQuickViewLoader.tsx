import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OrderEditDialog } from "@/components/order/OrderEditDialog";

interface Props {
  orderId: string;
  onClose: () => void;
}

export function OrderQuickViewLoader({ orderId, onClose }: Props) {
  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ["report-order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || error || !order) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="py-8 text-center text-destructive text-sm">
              Failed to load order. {(error as Error)?.message ?? ""}
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <OrderEditDialog
      order={order as any}
      onOrderUpdated={() => refetch()}
      onClose={onClose}
    />
  );
}
