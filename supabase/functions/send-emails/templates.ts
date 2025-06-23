
import { render } from 'npm:@react-email/render@0.0.15';
import * as React from 'npm:react@18.3.1';

export async function renderInvoiceEmail(data: any) {
  console.log('Rendering invoice email with data:', data);
  
  const { InvoiceEmail } = await import('./_templates/invoice.tsx');
  
  return await render(
    React.createElement(InvoiceEmail, {
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      invoiceNumber: data.invoiceNumber,
      orderItems: data.orderItems,
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      totalAmount: data.totalAmount,
      dueDate: data.dueDate,
      paymentStatus: data.paymentStatus,
      paymentUrl: data.paymentUrl,
    })
  );
}

export async function renderOrderConfirmationEmail(data: any) {
  console.log('Rendering order confirmation email with data:', data);
  
  const { OrderConfirmationEmail } = await import('./_templates/order-confirmation.tsx');
  
  return await render(
    React.createElement(OrderConfirmationEmail, {
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      orderItems: data.orderItems,
      totalAmount: data.totalAmount,
      deliveryAddress: data.deliveryAddress,
      deliveryDate: data.deliveryDate,
      deliveryTime: data.deliveryTime,
      specialInstructions: data.specialInstructions,
    })
  );
}

export async function renderDeliveryStatusUpdateEmail(data: any) {
  console.log('Rendering delivery status update email with data:', data);
  
  const { DeliveryStatusUpdateEmail } = await import('./_templates/delivery-status-update.tsx');
  
  return await render(
    React.createElement(DeliveryStatusUpdateEmail, {
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      driverName: data.driverName,
      notes: data.notes,
      estimatedDeliveryTime: data.estimatedDeliveryTime,
    })
  );
}

export async function renderPaymentConfirmationEmail(data: any) {
  console.log('Rendering payment confirmation email with data:', data);
  
  const { PaymentConfirmationEmail } = await import('./_templates/payment-confirmation.tsx');
  
  return await render(
    React.createElement(PaymentConfirmationEmail, {
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      invoiceNumber: data.invoiceNumber,
      paymentAmount: data.paymentAmount,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      orderItems: data.orderItems,
      receiptDownloadUrl: data.receiptDownloadUrl,
      paymentDate: data.paymentDate,
    })
  );
}

export async function renderBatchInvoiceEmail(data: any) {
  console.log('Rendering batch invoice email with data:', data);
  
  const { BatchInvoiceEmail } = await import('./_templates/batch-invoice.tsx');
  
  return await render(
    React.createElement(BatchInvoiceEmail, {
      customerName: data.customerName,
      masterOrderNumber: data.masterOrderNumber,
      invoiceNumber: data.invoiceNumber,
      allOrders: data.allOrders,
      grandTotal: data.grandTotal,
      dueDate: data.dueDate,
      paymentStatus: data.paymentStatus,
      paymentUrl: data.paymentUrl,
    })
  );
}
