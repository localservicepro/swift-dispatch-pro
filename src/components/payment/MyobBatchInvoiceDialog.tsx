import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Edit2 } from "lucide-react";

interface PaymentOrder {
  id: string;
  order_number: string;
  purchase_order?: string;
  customer_name: string;
  total_amount: number;
  products: any;
  delivery_fee?: number;
  subtotal?: number;
  delivery_date?: string;
  delivery_address?: string;
  delivery_method?: string;
  company_name?: string;
  business_name?: string;
}

interface LineItem {
  orderNumber: string;
  description: string;
  amount: number;
  date: string;
  taxCode: string;
  orderId: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: PaymentOrder[];
  onSuccess: () => void;
}

function formatOrderDescription(order: PaymentOrder): string {
  const orderNum = (order.order_number || "").replace(/^ORD-/i, "");
  
  // Parse products to build description
  let productParts: string[] = [];
  if (Array.isArray(order.products)) {
    productParts = order.products.map((p: any) => {
      const qty = p.quantity || 1;
      const name = p.name || p.product_name || "Product";
      return `${qty} ${name}`;
    });
  }

  const deliveryType = order.delivery_method === "pickup" ? "Picked up from yard" : "DEL";
  
  // Extract suburb from delivery address (last part after comma)
  let suburb = "";
  if (order.delivery_address) {
    const parts = order.delivery_address.split(",").map((s: string) => s.trim());
    suburb = parts.length > 1 ? parts[parts.length - 2] || parts[parts.length - 1] : parts[0];
  }

  const productStr = productParts.join(", ");
  return `${orderNum} - ${productStr} - ${deliveryType}${suburb ? ` - ${suburb}` : ""}`;
}

export function MyobBatchInvoiceDialog({ open, onOpenChange, selectedOrders, onSuccess }: Props) {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerPO, setCustomerPO] = useState("");
  const [pushing, setPushing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && selectedOrders.length > 0) {
      // Set customer name from first order
      const first = selectedOrders[0];
      setCustomerName(first.company_name || first.business_name || first.customer_name || "");
      setCustomerPO(first.purchase_order || "");

      // Build line items
      const items: LineItem[] = selectedOrders.map((order) => ({
        orderId: order.id,
        orderNumber: order.order_number,
        description: formatOrderDescription(order),
        accountNumber: "4-1010",
        amount: Number(order.total_amount || 0),
        date: order.delivery_date || new Date().toISOString().split("T")[0],
        taxCode: "GST",
      }));
      setLineItems(items);
    }
  }, [open, selectedOrders]);

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const handlePushToMyob = async () => {
    if (!customerName.trim()) {
      toast({ title: "Error", description: "Customer name is required", variant: "destructive" });
      return;
    }
    setPushing(true);
    try {
      const { data, error } = await supabase.functions.invoke("myob-push-invoice", {
        body: {
          orderIds: lineItems.map((item) => item.orderId),
          customerName: customerName.trim(),
          invoiceDate,
          customerPO: customerPO || undefined,
          lineItems: lineItems.map((item) => ({
            orderNumber: item.orderNumber,
            description: item.description,
            accountNumber: item.accountNumber,
            amount: item.amount,
            date: item.date,
            taxCode: item.taxCode,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Invoice Pushed to MYOB",
        description: `MYOB Invoice #${data.myobInvoiceNumber || "Created"} — ${data.orderCount} orders synced`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("MYOB push error:", err);
      toast({
        title: "MYOB Error",
        description: err.message || "Failed to push invoice to MYOB",
        variant: "destructive",
      });
    } finally {
      setPushing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Batch Invoice to MYOB
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="myob-customer">Customer Name (MYOB)</Label>
              <Input
                id="myob-customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Company name in MYOB"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-matched by company name in MYOB
              </p>
            </div>
            <div>
              <Label htmlFor="myob-date">Invoice Date</Label>
              <Input
                id="myob-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="myob-po">Customer PO (Optional)</Label>
              <Input
                id="myob-po"
                value={customerPO}
                onChange={(e) => setCustomerPO(e.target.value)}
                placeholder="Purchase Order #"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Account</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                  <TableHead className="w-20">Tax</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, idx) => (
                  <TableRow key={item.orderId}>
                    <TableCell>
                      {editingIndex === idx ? (
                        <Input
                          type="date"
                          value={item.date}
                          onChange={(e) => updateLineItem(idx, "date", e.target.value)}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <span className="text-xs">
                          {new Date(item.date).toLocaleDateString("en-AU")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === idx ? (
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <span className="text-xs">{item.description}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === idx ? (
                        <Input
                          value={item.accountNumber}
                          onChange={(e) => updateLineItem(idx, "accountNumber", e.target.value)}
                          className="h-8 text-xs w-20"
                        />
                      ) : (
                        <span className="text-xs">{item.accountNumber}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingIndex === idx ? (
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateLineItem(idx, "amount", parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right w-24"
                        />
                      ) : (
                        <span className="text-xs font-medium">${item.amount.toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === idx ? (
                        <Select
                          value={item.taxCode}
                          onValueChange={(val) => updateLineItem(idx, "taxCode", val)}
                        >
                          <SelectTrigger className="h-8 text-xs w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GST">GST</SelectItem>
                            <SelectItem value="FRE">FRE</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">{item.taxCode}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell colSpan={3} className="text-right">Total (GST Inclusive)</TableCell>
                  <TableCell className="text-right">${totalAmount.toFixed(2)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            {lineItems.length} order(s) will be grouped into a single MYOB Sale Invoice.
            Click the edit icon to modify any line item before pushing.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pushing}>
            Cancel
          </Button>
          <Button
            onClick={handlePushToMyob}
            disabled={pushing || lineItems.length === 0}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {pushing ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Pushing to MYOB...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Push to MYOB ({lineItems.length} items)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
