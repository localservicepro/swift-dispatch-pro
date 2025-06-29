
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
      let updateData: any = {
        payment_status: newStatus,
        updated_at: new Date().toISOString()
      };

      // When marking as paid, also set payment_date
      if (newStatus === 'paid') {
        updateData.payment_date = new Date().toISOString();
        
        // If order is currently in requested status, move it to preparing
        if (order.status === 'requested') {
          updateData.status = 'preparing';
        }
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (error) throw error;

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
        if (updateData.status && updateData.status !== order.status) {
          await activityLogger.orderStatusUpdate(
            order.id,
            order.order_number,
            order.customer_name,
            order.status,
            updateData.status,
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
