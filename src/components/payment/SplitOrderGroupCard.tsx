
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
      
      // Get customer email properly
      const customerEmail = group.masterOrder.customers?.email || 
        `${group.masterOrder.customer_name.toLowerCase().replace(' ', '.')}@example.com`;
      
      // Send batch invoice email
      const { error: emailError } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'batch-invoice',
          data: {
            customerName: group.masterOrder.customer_name,
            customerEmail,
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
        description: error.message || "Failed to create batch invoice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Split Order Group - {group.masterOrder.customer_name}</span>
            <Badge variant="outline">
              {group.allOrders.length} orders
            </Badge>
          </div>
          <span className="text-lg font-bold text-green-600">
            ${group.totalAmount.toFixed(2)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Master Order</p>
            <p className="font-medium">{group.masterOrder.order_number}</p>
          </div>
          <div>
            <p className="text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Address
            </p>
            <p className="font-medium">{group.masterOrder.customer_address}</p>
          </div>
          <div>
            <p className="text-slate-500 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              Delivery Status
            </p>
            <p className="font-medium">
              {group.canInvoice ? 'Ready to invoice' : 'Already invoiced'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Related Orders:</p>
          <div className="grid grid-cols-1 gap-2">
            {group.allOrders.map((order) => (
              <div key={order.id} className="flex justify-between items-center p-2 bg-slate-50 rounded text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{order.order_number}</span>
                  <Badge variant="outline" className="text-xs">
                    {order.status}
                  </Badge>
                </div>
                <span className="font-medium">${order.total_amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {group.canInvoice && (
          <Button 
            onClick={handleCreateBatchInvoice}
            disabled={isGenerating}
            className="w-full flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Receipt className="w-4 h-4" />
            )}
            {isGenerating ? "Creating Batch Invoice..." : "Create Batch Invoice"}
          </Button>
        )}

        {group.hasExistingInvoice && (
          <div className="text-center py-2">
            <Badge className="bg-green-100 text-green-800">
              Batch invoice already created
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
