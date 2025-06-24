import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, X, FileText, CreditCard, Loader2 } from "lucide-react";
import { formatCurrency } from "@/components/order/utils/paymentCalculations";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface PaymentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  products: any;
  total_amount: number;
  status: OrderStatus;
  payment_status: string;
  driver_id?: string;
  created_at: string;
  delivery_date?: string;
  delivery_time?: string;
  special_instructions?: string;
  customer_id?: string;
  suburb_id?: string;
  delivery_fee?: number;
  subtotal?: number;
  batch_invoice_id?: string;
  customers?: {
    email?: string;
  };
}

const PaymentManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("pending");
  const [creatingInvoice, setCreatingInvoice] = useState<string | null>(null);

  const { data: orders = [], isLoading, error, refetch: refetchOrders } = useQuery({
    queryKey: ['paymentOrders'],
    queryFn: async () => {
      console.log('Fetching payment orders from database...');
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          customer_address,
          products,
          total_amount,
          status,
          payment_status,
          driver_id,
          created_at,
          delivery_date,
          delivery_time,
          special_instructions,
          customer_id,
          delivery_fee,
          subtotal,
          batch_invoice_id,
          customers!orders_customer_id_fkey(
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      console.log('Payment orders data:', ordersData);
      return ordersData || [];
    },
  });

  const { toast } = useToast();

  const filteredOrders = orders.filter(order => {
    const search = searchQuery.toLowerCase().trim();
    const matchesSearch =
      order.order_number.toLowerCase().includes(search) ||
      order.customer_name.toLowerCase().includes(search) ||
      (order.customer_phone && order.customer_phone.toLowerCase().includes(search));

    const matchesStatus = paymentStatusFilter === "all" || order.payment_status === paymentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setPaymentStatusFilter("pending");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || paymentStatusFilter !== "pending";

  // Utility function to wait for database transaction completion
  const waitForTransactionCommit = async (delay: number = 1500): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, delay));
  };

  // Retry mechanism for database operations
  const retryOperation = async <T,>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
        
        if (i < maxRetries - 1) {
          // Exponential backoff
          const delay = baseDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };

  const handleCreateInvoice = async (order: PaymentOrder) => {
    setCreatingInvoice(order.id);
    
    try {
      console.log('Creating individual invoice for order:', order.id);
      
      const invoiceNumber = `INV-${order.order_number}-${Date.now()}`;
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create invoice with standardized currency
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          order_id: order.id,
          customer_email: order.customers?.email || `${order.customer_name.toLowerCase().replace(' ', '.')}@example.com`,
          amount: order.total_amount,
          currency: 'USD', // Standardized currency format
          status: 'pending',
          due_date: dueDate
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError);
        throw new Error(`Failed to create invoice: ${invoiceError.message}`);
      }

      console.log('Invoice created:', invoice.id);

      // Wait for transaction commit
      await waitForTransactionCommit();

      // Verify invoice exists
      const { data: verifyInvoice, error: verifyError } = await supabase
        .from('invoices')
        .select('id, invoice_number, status')
        .eq('id', invoice.id)
        .single();

      if (verifyError || !verifyInvoice) {
        console.error('Invoice verification failed:', verifyError);
        throw new Error('Invoice creation failed - invoice not found after creation');
      }

      console.log('Invoice verified successfully:', verifyInvoice);

      // Create payment session with retry mechanism
      const paymentResult = await retryOperation(async () => {
        console.log('Attempting to create payment session for invoice:', invoice.id);
        
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-invoice-payment', {
          body: { invoiceId: invoice.id }
        });

        if (paymentError) {
          console.error('Payment session error:', paymentError);
          throw new Error(`Payment session error: ${paymentError.message}`);
        }

        if (!paymentData?.success) {
          console.error('Payment session failed:', paymentData);
          throw new Error(paymentData?.error || 'Failed to create payment session');
        }

        return paymentData;
      });

      // Update order with invoice reference
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'invoiced'
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Error updating order status:', updateError);
        // Don't fail the entire operation for this
      }

      toast({
        title: "Invoice Created",
        description: `Invoice ${invoice.invoice_number} created successfully. Opening payment page...`,
      });

      // Open payment URL in new tab
      if (paymentResult.paymentUrl) {
        window.open(paymentResult.paymentUrl, '_blank');
      }

      // Refresh data
      refetchOrders();
      
    } catch (error: any) {
      console.error('Invoice creation failed:', error);
      
      toast({
        title: "Invoice Creation Failed",
        description: error.message || "Failed to create invoice. Please check the logs and try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingInvoice(null);
    }
  };

  // Helper function to safely format products
  const formatProducts = (products: any) => {
    if (!products) return 'No products';
    
    try {
      if (Array.isArray(products)) {
        return products.map(p => {
          const name = p?.name || p?.product_name || 'Product';
          const quantity = p?.quantity || 1;
          return `${name} (Qty: ${quantity})`;
        }).join(', ');
      }
      return 'Products listed';
    } catch (error) {
      console.warn('Error formatting products:', error);
      return 'Products listed';
    }
  };

  if (error) {
    console.error('Payment orders query error:', error);
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading payment orders. Please try again.</p>
              <Button onClick={() => refetchOrders()} className="mt-2">Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Payment Management</h2>
          <p className="text-slate-600 mt-1">Manage order payments and invoices</p>
        </div>
      </div>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Orders Awaiting Payment
              {isLoading && <span className="text-sm font-normal text-slate-500">(Loading...)</span>}
              {!isLoading && (
                <span className="text-sm font-normal text-slate-500">
                  ({filteredOrders.length} of {orders.length} orders)
                </span>
              )}
            </CardTitle>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by order number, customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 sm:w-48">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {hasActiveFilters ? (
                <div>
                  <p>No orders match your current filters.</p>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <p>No orders awaiting payment found.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-800">{order.order_number}</h3>
                      <Badge className={
                        order.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.payment_status === 'invoiced' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {order.payment_status}
                      </Badge>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-slate-500">Customer</p>
                      <p className="font-medium">{order.customer_name}</p>
                      {order.customer_phone && (
                        <p className="text-xs text-slate-400">{order.customer_phone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-500">Products</p>
                      <p className="font-medium">{formatProducts(order.products)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Address</p>
                      <p className="font-medium">{order.customer_address}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Created</p>
                      <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {order.special_instructions && (
                    <div className="mb-3">
                      <p className="text-slate-500 flex items-center gap-1 mb-1">
                        <FileText className="w-3 h-3" />
                        Notes
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                        <p className="text-sm text-yellow-800">{order.special_instructions}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    {order.payment_status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleCreateInvoice(order)}
                        disabled={!!creatingInvoice}
                      >
                        {creatingInvoice === order.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Invoice...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Create Invoice
                          </>
                        )}
                      </Button>
                    )}
                    {order.payment_status === 'invoiced' && (
                      <Button size="sm" variant="secondary" disabled>
                        Invoiced
                      </Button>
                    )}
                    {order.payment_status === 'paid' && (
                      <Button size="sm" variant="ghost" disabled>
                        Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentManagement;
