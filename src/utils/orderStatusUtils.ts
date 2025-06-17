
import { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  requested: 'Requested',
  preparing: 'Preparing',
  loading: 'Loading',
  en_route: 'En Route',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  requested: 'bg-slate-100 text-slate-800',
  preparing: 'bg-blue-100 text-blue-800',
  loading: 'bg-orange-100 text-orange-800',
  en_route: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export const validateStatusTransition = (
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): { isValid: boolean; message?: string } => {
  const statusOrder: OrderStatus[] = ['requested', 'preparing', 'loading', 'en_route', 'delivered'];
  const currentIndex = statusOrder.indexOf(currentStatus);
  const newIndex = statusOrder.indexOf(newStatus);

  // Allow cancellation from any status
  if (newStatus === 'cancelled') {
    return { isValid: true };
  }

  // Allow moving from requested to any status (admin flexibility)
  if (currentStatus === 'requested') {
    return { isValid: true };
  }

  // Don't allow moving backwards (except cancellation)
  if (newIndex < currentIndex) {
    return {
      isValid: false,
      message: "Orders cannot be moved backwards in the pipeline"
    };
  }

  // Don't allow skipping stages
  if (newIndex > currentIndex + 1) {
    return {
      isValid: false,
      message: "Orders must progress through stages sequentially"
    };
  }

  return { isValid: true };
};

export const getNextValidStatus = (currentStatus: OrderStatus): OrderStatus | null => {
  const statusOrder: OrderStatus[] = ['requested', 'preparing', 'loading', 'en_route', 'delivered'];
  const currentIndex = statusOrder.indexOf(currentStatus);
  
  if (currentIndex === -1 || currentIndex >= statusOrder.length - 1) {
    return null;
  }
  
  return statusOrder[currentIndex + 1];
};
