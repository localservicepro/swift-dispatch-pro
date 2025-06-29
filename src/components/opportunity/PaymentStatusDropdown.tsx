
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { activityLogger } from "@/utils/activityLogger";

interface PaymentStatusDropdownProps {
  order: any;
  onStatusUpdate: () => void;
}

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Payment Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'paid', label: 'Paid', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'invoiced', label: 'Invoiced', icon: CreditCard, color: 'bg-blue-100 text-blue-800' },
  { value: 'overdue', label: 'Overdue', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'bg-gray-100 text-gray-800' }
];

export function PaymentStatusDropdown({ order, onStatusUpdate }: PaymentStatusDropdownProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const currentStatus = PAYMENT_STATUSES.find(s => s.value === order.payment_status);
  const CurrentIcon = currentStatus?.icon || CreditCard;

  const updatePaymentStatus = async (newStatus: string) => {
    if (newStatus === order.payment_status || isUpdating) return;

    setIsUpdating(true);
    try {
      // Use RPC function instead of direct table update
      const { error } = await supabase.rpc('update_payment_status', {
        p_order_id: order.id,
        p_new_status: newStatus,
        p_payment_date: newStatus === 'paid' ? new Date().toISOString() : null
      });

      if (error) throw error;

      // If marking as paid and order is in requested status, move it to preparing
      if (newStatus === 'paid' && order.status === 'requested') {
        const { error: statusError } = await supabase.rpc('update_order_status', {
          order_id: order.id,
          new_status: 'preparing'
        });

        if (statusError) {
          console.warn('Failed to update order status:', statusError);
        }
      }

      // Log the activity
      if (profile?.full_name) {
        await activityLogger.paymentUpdate(
          order.id,
          order.order_number,
          order.payment_status,
          newStatus,
          profile.full_name
        );

        // If we also updated the order status, log that too
        if (newStatus === 'paid' && order.status === 'requested') {
          await activityLogger.orderStatusUpdate(
            order.id,
            order.order_number,
            order.customer_name,
            order.status,
            'preparing',
            profile.full_name
          );
        }
      }

      const statusLabel = PAYMENT_STATUSES.find(s => s.value === newStatus)?.label || newStatus;
      toast({
        title: "Payment Status Updated",
        description: `Order ${order.order_number} payment status updated to ${statusLabel}`,
      });

      onStatusUpdate();
    } catch (error: any) {
      console.error('Failed to update payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (order.payment_status === 'paid') {
    return (
      <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Paid
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`p-1 h-auto ${currentStatus?.color || 'bg-yellow-100 text-yellow-800'} hover:opacity-80`}
          disabled={isUpdating}
          onClick={(e) => e.stopPropagation()}
        >
          <CurrentIcon className="w-3 h-3 mr-1" />
          {currentStatus?.label || 'Payment Pending'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        {PAYMENT_STATUSES.map((status) => {
          const StatusIcon = status.icon;
          return (
            <DropdownMenuItem
              key={status.value}
              onClick={() => updatePaymentStatus(status.value)}
              disabled={isUpdating || status.value === order.payment_status}
              className="flex items-center gap-2"
            >
              <StatusIcon className="w-4 h-4" />
              {status.label}
              {status.value === order.payment_status && (
                <CheckCircle className="w-3 h-3 ml-auto text-green-600" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
