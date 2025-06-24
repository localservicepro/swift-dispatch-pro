
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Bell, RefreshCw } from "lucide-react";
import { PaymentSearchFilters } from "@/components/payment/PaymentSearchFilters";
import { PaymentSettings } from "@/components/payment/PaymentSettings";
import { usePaymentFilters } from "@/hooks/usePaymentFilters";
import { SplitOrderGroupCard } from "@/components/payment/SplitOrderGroupCard";
import { PaymentStatistics } from "@/components/payment/PaymentStatistics";
import { PaymentActions } from "@/components/payment/PaymentActions";
import { PaymentRecordsList } from "@/components/payment/PaymentRecordsList";
import { usePaymentManagement } from "@/hooks/usePaymentManagement";

export function PaymentManagement() {
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    payments,
    isLoading,
    error,
    refetch,
    selectedPayments,
    setSelectedPayments,
    sendingInvoices,
    setSendingInvoices,
    generatingInvoices,
    setGeneratingInvoices,
    lastUpdateTime,
    splitOrderGroups,
    togglePaymentSelection,
    updatePaymentStatus,
    toast
  } = usePaymentManagement();

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

  // Filter out individual split orders from the regular payment list
  const nonSplitPayments = filteredPayments.filter(payment => {
    return !splitOrderGroups.some(group => 
      group.allOrders.some((order: any) => order.id === payment.id)
    );
  });

  const generateAndSendInvoice = async (orderId: string) => {
    if (generatingInvoices.includes(orderId)) return;
    setGeneratingInvoices(prev => [...prev, orderId]);

    try {
      const order = payments.find(p => p.id === orderId);
      if (!order) throw new Error('Order not found');

      console.log('Starting invoice generation for order:', order.order_number);

      // Generate unique invoice number
      const invoiceNumber = `INV-${order.order_number}-${Date.now()}`;
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create invoice record first
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          order_id: orderId,
          customer_email: order.customer_email,
          amount: order.total_amount,
          currency: 'USD',
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

      // Create payment session
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-invoice-payment', {
        body: { invoiceId: invoice.id }
      });

      if (paymentError) {
        console.error('Payment session error:', paymentError);
        await supabase.from('invoices').delete().eq('id', invoice.id);
        throw new Error(`Failed to create payment session: ${paymentError.message}`);
      }

      if (!paymentData.success) {
        console.error('Payment session failed:', paymentData);
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
      const { error: emailError } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'invoice',
          data: {
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            orderNumber: order.order_number,
            invoiceNumber: invoiceNumber,
            orderItems: orderItems,
            subtotal: order.subtotal || order.total_amount - (order.delivery_fee || 0),
            deliveryFee: order.delivery_fee || 0,
            totalAmount: order.total_amount,
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
        await updatePaymentStatus(orderId, 'invoiced');
        
        toast({
          title: "Invoice Generated & Sent",
          description: `Invoice ${invoiceNumber} sent to ${order.customer_name} with payment link`,
          action: (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          )
        });
      }

      refetch();
      
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

      const { error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'invoice',
          data: {
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            orderNumber: order.order_number,
            invoiceNumber: `INV-${order.order_number}`,
            orderItems: orderItems,
            subtotal: order.subtotal || order.total_amount - (order.delivery_fee || 0),
            deliveryFee: order.delivery_fee || 0,
            totalAmount: order.total_amount,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            paymentStatus: order.payment_status
          }
        }
      });

      if (error) throw error;
      
      await updatePaymentStatus(orderId, 'invoiced');
      
      toast({
        title: "Invoice Sent",
        description: `Invoice for ${order.order_number} has been sent to ${order.customer_name}`
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

  // Calculate statistics from filtered data (excluding split orders to avoid double counting)
  const totalReceived = nonSplitPayments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + p.total_amount, 0) +
    splitOrderGroups.filter(g => g.hasExistingInvoice).reduce((sum, g) => sum + g.totalAmount, 0);
  
  const pendingPayments = nonSplitPayments.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + p.total_amount, 0) +
    splitOrderGroups.filter(g => g.canInvoice).reduce((sum, g) => sum + g.totalAmount, 0);
  
  const invoicedPayments = nonSplitPayments.filter(p => p.payment_status === 'invoiced').reduce((sum, p) => sum + p.total_amount, 0) +
    splitOrderGroups.filter(g => g.hasExistingInvoice && !g.canInvoice).reduce((sum, g) => sum + g.totalAmount, 0);
  
  const overduePayments = nonSplitPayments.filter(p => p.payment_status === 'overdue').reduce((sum, p) => sum + p.total_amount, 0);
  
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Payment Management</h2>
            <p className="text-slate-600 mt-1">Track payments and manage invoicing</p>
          </div>
        </div>
        
        <div className="text-center text-red-600">
          <p>Error loading payment data. Please try again.</p>
          <Button onClick={() => refetch()} className="mt-2">Retry</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Payment Management</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-600">Track payments and manage invoicing • Real-time updates enabled</p>
            <Bell className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-600">Live</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Last updated: {lastUpdateTime.toLocaleTimeString()}
          </p>
        </div>
        <PaymentActions
          selectedPayments={selectedPayments}
          sendingInvoices={sendingInvoices}
          onBatchInvoice={sendBatchInvoices}
          onShowSettings={() => setShowSettings(true)}
        />
      </div>

      <PaymentSettings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      <PaymentSearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearAllFilters}
        activeFilterCount={activeFilterCount}
      />

      <PaymentStatistics
        totalReceived={totalReceived}
        invoicedPayments={invoicedPayments}
        pendingPayments={pendingPayments}
        overduePayments={overduePayments}
      />

      {/* Split Order Groups */}
      {splitOrderGroups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Split Order Groups</h3>
          {splitOrderGroups.map((group, index) => (
            <SplitOrderGroupCard
              key={group.masterOrder.id}
              group={group}
              onInvoiceCreated={() => refetch()}
            />
          ))}
        </div>
      )}

      <PaymentRecordsList
        payments={nonSplitPayments}
        selectedPayments={selectedPayments}
        sendingInvoices={sendingInvoices}
        generatingInvoices={generatingInvoices}
        isLoading={isLoading}
        activeFilterCount={activeFilterCount}
        onToggleSelection={togglePaymentSelection}
        onGenerateInvoice={generateAndSendInvoice}
        onSendInvoice={sendInvoice}
        onUpdateStatus={updatePaymentStatus}
        onClearFilters={clearAllFilters}
      />
    </div>
  );
}
