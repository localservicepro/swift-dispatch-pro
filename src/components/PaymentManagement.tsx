import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Receipt, Bell, Settings, RefreshCw, Send } from "lucide-react";
import { useRealTimePayments } from "@/hooks/useRealTimePayments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentSearchFilters } from "@/components/payment/PaymentSearchFilters";
import { PaymentSettings } from "@/components/payment/PaymentSettings";
import { usePaymentFilters } from "@/hooks/usePaymentFilters";
import { PurchaseOrderDisplay } from "@/components/order/PurchaseOrderDisplay";
import { calculateDisplayTotal } from "@/utils/totalCalculationUtils";
import { ReceiptButton } from "@/components/ui/receipt-button";
import { MyobBatchInvoiceDialog } from "@/components/payment/MyobBatchInvoiceDialog";

interface PaymentOrder {
  id: string;
  order_number: string;
  purchase_order?: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  payment_status: string;
  payment_method?: string;
  payment_date?: string;
  created_at: string;
  products: any;
  delivery_fee?: number;
  subtotal?: number;
  company_name?: string;
  business_name?: string;
}

export function PaymentManagement() {
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [sendingInvoices, setSendingInvoices] = useState<string[]>([]);
  const [generatingInvoices, setGeneratingInvoices] = useState<string[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showMyobDialog, setShowMyobDialog] = useState(false);
  const [myobConnected, setMyobConnected] = useState(false);
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();

  // Check MYOB connection status
  useEffect(() => {
    const checkMyob = async () => {
      try {
        const { data } = await supabase.functions.invoke("myob-auth", {
          body: { action: "get-settings" },
        });
        if (data?.settings?.connection_status === "connected" || data?.settings?.connection_status === "configured") {
          setMyobConnected(true);
        }
      } catch {
        // MYOB not configured, that's fine
      }
    };
    checkMyob();
  }, []);

  // Set up real-time payment updates
  useRealTimePayments(update => {
    console.log('Payment update received in PaymentManagement:', update);
    setLastUpdateTime(new Date());
    queryClient.invalidateQueries({
      queryKey: ['payment-orders']
    });
  });

  // Fetch orders for payment management
  const {
    data: payments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['payment-orders'],
    queryFn: async (): Promise<PaymentOrder[]> => {
      console.log('Fetching payment orders from database...');
      const {
        data,
        error
      } = await supabase.from('orders').select(`
          id,
          order_number,
          purchase_order,
          customer_id,
          customer_name,
          customer_phone,
          total_amount,
          payment_status,
          payment_method,
          payment_date,
          created_at,
          products,
          delivery_fee,
          subtotal,
          deleted_at,
          customers!orders_customer_id_fkey(
            email,
            company_name,
            business_name
          )
        `)
        .is('deleted_at', null)
        .order('created_at', {
        ascending: false
      });
      if (error) {
        console.error('Error fetching payment orders:', error);
        throw error;
      }
      return data.map(order => ({
        ...order,
        customer_email: order.customers?.email || '',
        payment_status: order.payment_status || 'pending',
        company_name: order.customers?.company_name || null,
        business_name: order.customers?.business_name || null
      }));
    },
    refetchInterval: 30000
  });

  // Initialize search and filter functionality
  const {
    searchTerm,
    setSearchTerm,
    filters,
    filteredPayments,
    handleFilterChange,
    clearAllFilters,
    activeFilterCount
  } = usePaymentFilters(payments);

  // Helper function to get the display name for customer
  const getCustomerDisplayName = (payment: PaymentOrder): string => {
    // Prioritize company name for account customers
    if (payment.company_name) {
      return payment.company_name;
    }
    
    // Fall back to business name for business customers
    if (payment.business_name) {
      return payment.business_name;
    }
    
    // Use customer name as final fallback
    return payment.customer_name || 'Unknown Customer';
  };

  const generateAndSendInvoice = async (orderId: string) => {
    if (generatingInvoices.includes(orderId)) return;
    setGeneratingInvoices(prev => [...prev, orderId]);
    try {
      const order = payments.find(p => p.id === orderId);
      if (!order) throw new Error('Order not found');
      console.log('Starting invoice generation for order:', order.order_number);

      // Check if invoice already exists for this order
      const {
        data: existingInvoice,
        error: checkError
      } = await supabase.from('invoices').select('id').eq('order_id', orderId).maybeSingle();
      if (checkError) {
        console.error('Error checking existing invoice:', checkError);
        throw new Error(`Failed to check existing invoice: ${checkError.message}`);
      }
      if (existingInvoice) {
        throw new Error('Invoice already exists for this order');
      }

      // Generate unique invoice number
      const invoiceNumber = `INV-${order.order_number}-${Date.now()}`;
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create invoice record using calculated total
      const calculatedTotal = calculateDisplayTotal(order);
      const {
        data: invoice,
        error: invoiceError
      } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        order_id: orderId,
        customer_email: order.customer_email || `${getCustomerDisplayName(order).toLowerCase().replace(' ', '.')}@example.com`,
        amount: calculatedTotal,
        currency: 'USD',
        status: 'pending',
        due_date: dueDate
      }).select().single();
      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError);
        throw new Error(`Failed to create invoice: ${invoiceError.message}`);
      }
      console.log('Invoice created:', invoice.id);

      // Create payment session
      const {
        data: paymentData,
        error: paymentError
      } = await supabase.functions.invoke('create-invoice-payment', {
        body: {
          invoiceId: invoice.id
        }
      });
      if (paymentError) {
        console.error('Payment session error:', paymentError);
        // Clean up the invoice if payment session creation fails
        await supabase.from('invoices').delete().eq('id', invoice.id);
        throw new Error(`Failed to create payment session: ${paymentError.message}`);
      }
      if (!paymentData.success) {
        console.error('Payment session failed:', paymentData);
        // Clean up the invoice if payment session creation fails
        await supabase.from('invoices').delete().eq('id', invoice.id);
        throw new Error(paymentData.error || 'Failed to create payment session');
      }
      console.log('Payment session created:', paymentData.sessionId);

      // Parse products for email
      let orderItems = [];
      if (Array.isArray(order.products)) {
        orderItems = order.products.map(item => ({
          name: item.name || item.product_name || 'Product',
          quantity: item.quantity || 1,
          price: item.price || item.unit_price || 0
        }));
      } else if (order.products && typeof order.products === 'object') {
        orderItems = [{
          name: order.products.name || 'Product',
          quantity: order.products.quantity || 1,
          price: order.products.price || order.total_amount
        }];
      } else {
        orderItems = [{
          name: 'Order Items',
          quantity: 1,
          price: order.subtotal || order.total_amount - (order.delivery_fee || 0)
        }];
      }

      // Send invoice email with payment link
      const {
        error: emailError
      } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'invoice',
          data: {
            customerName: getCustomerDisplayName(order),
            customerEmail: order.customer_email || `${getCustomerDisplayName(order).toLowerCase().replace(' ', '.')}@example.com`,
            orderNumber: order.order_number,
            invoiceNumber: invoiceNumber,
            orderItems: orderItems,
            subtotal: order.subtotal || calculatedTotal - (order.delivery_fee || 0),
            deliveryFee: order.delivery_fee || 0,
            totalAmount: calculatedTotal,
            dueDate: new Date(dueDate).toLocaleDateString(),
            paymentStatus: 'Pending',
            paymentUrl: paymentData.paymentUrl
          }
        }
      });
      if (emailError) {
        console.error('Email sending error:', emailError);
        toast({
          title: "Invoice Created",
          description: `Invoice ${invoiceNumber} was created but email failed to send. Payment link is available in the system.`,
          variant: "destructive"
        });
      } else {
        // Update payment status to "invoiced" when email is sent successfully
        await updatePaymentStatus(orderId, 'invoiced');
        toast({
          title: "Invoice Generated & Sent",
          description: `Invoice ${invoiceNumber} sent to ${getCustomerDisplayName(order)} with payment link`,
          action: <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
        });
      }

      // Refresh data
      queryClient.invalidateQueries({
        queryKey: ['payment-orders']
      });
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate and send invoice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingInvoices(prev => prev.filter(id => id !== orderId));
    }
  };

  const sendInvoice = async (orderId: string) => {
    if (sendingInvoices.includes(orderId)) return;
    setSendingInvoices(prev => [...prev, orderId]);
    try {
      const order = payments.find(p => p.id === orderId);
      if (!order) throw new Error('Order not found');

      // Parse products from the order
      let orderItems = [];
      if (Array.isArray(order.products)) {
        orderItems = order.products.map(item => ({
          name: item.name || item.product_name || 'Product',
          quantity: item.quantity || 1,
          price: item.price || item.unit_price || 0
        }));
      } else if (order.products && typeof order.products === 'object') {
        orderItems = [{
          name: order.products.name || 'Product',
          quantity: order.products.quantity || 1,
          price: order.products.price || order.total_amount
        }];
      } else {
        orderItems = [{
          name: 'Order Items',
          quantity: 1,
          price: order.subtotal || order.total_amount - (order.delivery_fee || 0)
        }];
      }
      const {
        error
      } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'invoice',
          data: {
            customerName: getCustomerDisplayName(order),
            customerEmail: order.customer_email || `${getCustomerDisplayName(order).toLowerCase().replace(' ', '.')}@example.com`,
            orderNumber: order.order_number,
            invoiceNumber: `INV-${order.order_number}`,
            orderItems: orderItems,
            subtotal: order.subtotal || calculateDisplayTotal(order) - (order.delivery_fee || 0),
            deliveryFee: order.delivery_fee || 0,
            totalAmount: calculateDisplayTotal(order),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            paymentStatus: order.payment_status
          }
        }
      });
      if (error) throw error;

      // Update payment status to "invoiced" when simple invoice is sent successfully
      await updatePaymentStatus(orderId, 'invoiced');
      toast({
        title: "Invoice Sent",
        description: `Invoice for ${order.order_number} has been sent to ${getCustomerDisplayName(order)}`
      });
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast({
        title: "Error",
        description: "Failed to send invoice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingInvoices(prev => prev.filter(id => id !== orderId));
    }
  };

  const sendBatchInvoices = async () => {
    if (selectedPayments.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select orders to send batch invoices",
        variant: "destructive"
      });
      return;
    }
    setSendingInvoices(prev => [...prev, ...selectedPayments]);
    try {
      const promises = selectedPayments.map(orderId => sendInvoice(orderId));
      await Promise.all(promises);
      toast({
        title: "Batch Invoices Sent",
        description: `${selectedPayments.length} invoices have been sent`
      });
      setSelectedPayments([]);
    } catch (error: any) {
      console.error('Error sending batch invoices:', error);
      toast({
        title: "Error",
        description: "Some invoices failed to send. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingInvoices(prev => prev.filter(id => !selectedPayments.includes(id)));
    }
  };

  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    try {
      const {
        error
      } = await supabase.from('orders').update({
        payment_status: newStatus,
        payment_date: newStatus === 'paid' ? new Date().toISOString() : null
      }).eq('id', orderId);
      if (error) throw error;
      toast({
        title: "Payment Status Updated",
        description: `Payment status changed to ${newStatus}`
      });
      refetch();
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "invoiced":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments(prev => prev.includes(paymentId) ? prev.filter(id => id !== paymentId) : [...prev, paymentId]);
  };

  // Calculate statistics from filtered data using calculated totals
  const totalReceived = filteredPayments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + calculateDisplayTotal(p), 0);
  const pendingPayments = filteredPayments.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + calculateDisplayTotal(p), 0);
  const invoicedPayments = filteredPayments.filter(p => p.payment_status === 'invoiced').reduce((sum, p) => sum + calculateDisplayTotal(p), 0);
  const overduePayments = filteredPayments.filter(p => p.payment_status === 'overdue').reduce((sum, p) => sum + calculateDisplayTotal(p), 0);

  if (error) {
    return <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Payment Management</h2>
            <p className="text-slate-600 mt-1">Track payments and manage invoicing</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading payment data. Please try again.</p>
              <Button onClick={() => refetch()} className="mt-2">Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>;
  }

  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 text-lg">Payment Management</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-600">Track payments and manage invoicing • Real-time updates enabled</p>
            <Bell className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-600">Live</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Last updated: {lastUpdateTime.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {myobConnected && (
            <Button
              onClick={() => setShowMyobDialog(true)}
              variant="outline"
              disabled={selectedPayments.length === 0}
              className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Send className="w-4 h-4" />
              Batch Invoice to MYOB ({selectedPayments.length})
            </Button>
          )}
          <Button onClick={sendBatchInvoices} variant="outline" disabled={selectedPayments.length === 0 || selectedPayments.some(id => sendingInvoices.includes(id))} className="flex items-center gap-2">
            {selectedPayments.some(id => sendingInvoices.includes(id)) && <Loader2 className="w-4 h-4 animate-spin" />}
            Batch Invoice ({selectedPayments.length})
          </Button>
          <Button onClick={() => setShowSettings(true)} variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* MYOB Batch Invoice Dialog */}
      <MyobBatchInvoiceDialog
        open={showMyobDialog}
        onOpenChange={setShowMyobDialog}
        selectedOrders={payments.filter(p => selectedPayments.includes(p.id)) as any}
        onSuccess={() => {
          setSelectedPayments([]);
          queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
        }}
      />

      {/* Payment Settings Modal */}
      <PaymentSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Search and Filter Controls */}
      <PaymentSearchFilters searchTerm={searchTerm} onSearchChange={setSearchTerm} filters={filters} onFilterChange={handleFilterChange} onClearFilters={clearAllFilters} activeFilterCount={activeFilterCount} />

      {/* Payment Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">${totalReceived.toFixed(2)}</div>
            <p className="text-xs text-green-600 mt-1">From paid orders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">${invoicedPayments.toFixed(2)}</div>
            <p className="text-xs text-blue-600 mt-1">Invoices sent</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">${pendingPayments.toFixed(2)}</div>
            <p className="text-xs text-yellow-600 mt-1">Awaiting invoice</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">${overduePayments.toFixed(2)}</div>
            <p className="text-xs text-red-600 mt-1">Requires follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Records */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              Payment Records 
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Bell className="w-4 h-4 text-green-500" />
            </CardTitle>
            <Badge className="bg-green-100 text-green-800">
              Real-time Updates Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading payment records...</p>
            </div> : filteredPayments.length === 0 ? <div className="text-center py-8 text-slate-500">
              <p>{payments.length === 0 ? "No payment records found." : "No payment records match your search criteria."}</p>
              {activeFilterCount > 0 && <Button variant="outline" onClick={clearAllFilters} className="mt-2">
                  Clear all filters
                </Button>}
            </div> : <div className="space-y-4">
              {filteredPayments.map(payment => <div key={payment.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={selectedPayments.includes(payment.id)} onChange={() => togglePaymentSelection(payment.id)} className="w-4 h-4 text-blue-600 rounded" />
                      <div className="flex flex-col gap-1">
                        <h3 className="font-semibold text-slate-800">{payment.order_number}</h3>
                        <PurchaseOrderDisplay purchaseOrder={payment.purchase_order} variant="outline" className="text-xs" />
                        {(payment.company_name || payment.business_name) && (
                          <p className="text-xs text-slate-600 font-medium">
                            {payment.company_name || payment.business_name}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(payment.payment_status)}>
                        {payment.payment_status}
                      </Badge>
                    </div>
                    <span className="text-lg font-bold text-green-600">${calculateDisplayTotal(payment).toFixed(2)}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Customer</p>
                      <p className="font-medium">{getCustomerDisplayName(payment)}</p>
                      {payment.customer_phone && <p className="text-xs text-slate-400">{payment.customer_phone}</p>}
                    </div>
                    <div>
                      <p className="text-slate-500">Email</p>
                      <p className="font-medium text-xs">{payment.customer_email || ''}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Payment Method</p>
                      <p className="font-medium">{payment.payment_method || 'Not Set'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Order Date</p>
                      <p className="font-medium">{new Date(payment.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <ReceiptButton
                      orderId={payment.id}
                      orderNumber={payment.order_number}
                      variant="outline"
                      size="sm"
                      showLabel={true}
                    />
                    <Button size="sm" variant="outline" onClick={() => generateAndSendInvoice(payment.id)} disabled={generatingInvoices.includes(payment.id)} className="flex items-center gap-2">
                      {generatingInvoices.includes(payment.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                      {generatingInvoices.includes(payment.id) ? "Generating..." : "Generate Invoice"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendInvoice(payment.id)} disabled={sendingInvoices.includes(payment.id)} className="flex items-center gap-2">
                      {sendingInvoices.includes(payment.id) && <Loader2 className="w-4 h-4 animate-spin" />}
                      {sendingInvoices.includes(payment.id) ? "Sending..." : "Send Simple Invoice"}
                    </Button>
                    
                    <Select onValueChange={value => updatePaymentStatus(payment.id, value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>
    </div>;
}
