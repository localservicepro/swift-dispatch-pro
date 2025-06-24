
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Receipt, Truck, MapPin } from "lucide-react";
import { SplitOrderGroup, createBatchInvoiceForSplitOrder } from "@/components/order/utils/splitOrderUtils";
import { supabase } from "@/integrations/supabase/client";

interface SplitOrderGroupCardProps {
  group: SplitOrderGroup;
  onInvoiceCreated: () => void;
}

export function SplitOrderGroupCard({ group, onInvoiceCreated }: SplitOrderGroupCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleCreateBatchInvoice = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    try {
      const result = await createBatchInvoiceForSplitOrder(group);
      
      // Send batch invoice email
      const { error: emailError } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'batch-invoice',
          data: {
            customerName: group.masterOrder.customer_name,
            customerEmail: group.masterOrder.customers?.email || `${group.masterOrder.customer_name.toLowerCase().replace(' ', '.')}@example.com`,
            masterOrderNumber: group.masterOrder.order_number,
            invoiceNumber: result.invoice.invoice_number,
            allOrders: group.allOrders.map(order => ({
              orderNumber: order.order_number,
              deliveryAddress: order.delivery_address,
              orderItems: Array.isArray(order.products) ? order.products : [order.products],
              subtotal: order.subtotal || order.total_amount - (order.delivery_fee || 0),
              deliveryFee: order.delivery_fee || 0,
              totalAmount: order.total_amount,
              deliveryDate: order.delivery_date,
              deliveryTime: order.delivery_time
            })),
            grandTotal: group.totalAmount,
            dueDate: new Date(result.invoice.due_date).toLocaleDateString(),
            paymentStatus: 'Pending',
            paymentUrl: result.paymentUrl
          }
        }
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        toast({
          title: "Batch Invoice Created",
          description: `Batch invoice ${result.invoice.invoice_number} was created but email failed to send.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Batch Invoice Generated & Sent",
          description: `Batch invoice ${result.invoice.invoice_number} sent to ${group.masterOrder.customer_name} with payment link`,
        });
      }

      onInvoiceCreated();
      
    } catch (error: any) {
      console.error('Error creating batch invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate batch invoice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>Split Order Group: {group.masterOrder.order_number}</span>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              {group.allOrders.length} orders
            </Badge>
            <Badge variant="outline" className="text-xs font-bold">
              Total: ${group.totalAmount.toFixed(2)}
            </Badge>
            {group.hasExistingInvoice && (
              <Badge className="bg-green-100 text-green-800 text-xs">
                Invoiced
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Customer</p>
            <p className="font-medium">{group.masterOrder.customer_name}</p>
            {group.masterOrder.customer_phone && (
              <p className="text-xs text-slate-400">{group.masterOrder.customer_phone}</p>
            )}
          </div>
          <div>
            <p className="text-slate-500">Payment Method</p>
            <p className="font-medium">{group.masterOrder.payment_method || 'Not Set'}</p>
          </div>
          <div>
            <p className="text-slate-500">Order Date</p>
            <p className="font-medium">{new Date(group.masterOrder.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Split Order Details */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Delivery Details:</p>
          {group.allOrders.map((order, index) => (
            <div key={order.id} className="bg-white rounded p-3 border text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{order.order_number}</span>
                <span className="text-slate-600">${order.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-3 h-3" />
                <span className="text-xs">{order.delivery_address}</span>
              </div>
              {order.delivery_date && (
                <div className="text-xs text-slate-500 mt-1">
                  Delivery: {order.delivery_date} {order.delivery_time && `at ${order.delivery_time}`}
                </div>
              )}
            </div>
          ))}
        </div>

        {group.canInvoice && (
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleCreateBatchInvoice}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Receipt className="w-4 h-4" />
              )}
              {isGenerating ? "Creating Batch Invoice..." : "Create Batch Invoice"}
            </Button>
          </div>
        )}

        {!group.canInvoice && !group.hasExistingInvoice && (
          <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
            Cannot create batch invoice: Some orders have non-pending payment status
          </div>
        )}
      </CardContent>
    </Card>
  );
}
