import { renderAsync } from 'npm:@react-email/components@0.0.22'
import React from 'npm:react@18.3.1'
import { OrderConfirmationEmail } from './_templates/order-confirmation.tsx'
import { DeliveryStatusUpdateEmail } from './_templates/delivery-status-update.tsx'
import { InvoiceEmail } from './_templates/invoice.tsx'
import { PaymentConfirmationEmail } from './_templates/payment-confirmation.tsx'

export async function getEmailTemplate({ type, data }: { type: string, data: any }) {
  let emailHtml = ''
  let subject = ''
  let toEmail = ''

  switch (type) {
    case 'order-confirmation':
      emailHtml = await renderAsync(
        React.createElement(OrderConfirmationEmail, {
          customerName: data.customerName,
          orderNumber: data.orderNumber,
          orderItems: data.orderItems || [],
          totalAmount: data.totalAmount,
          deliveryAddress: data.deliveryAddress,
          deliveryDate: data.deliveryDate,
          deliveryTime: data.deliveryTime,
          specialInstructions: data.specialInstructions,
        })
      )
      subject = `Order Confirmation - ${data.orderNumber}`
      toEmail = data.customerEmail
      break

    case 'delivery-status-update':
      emailHtml = await renderAsync(
        React.createElement(DeliveryStatusUpdateEmail, {
          customerName: data.customerName,
          orderNumber: data.orderNumber,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          driverName: data.driverName,
          notes: data.notes,
          estimatedDeliveryTime: data.estimatedDeliveryTime,
        })
      )
      subject = `Delivery Update - ${data.orderNumber}`
      toEmail = data.customerEmail
      break

    case 'payment-confirmation':
      if (!data.customerName || !data.orderNumber || !data.invoiceNumber || !data.transactionId) {
        throw new Error('Missing required payment confirmation data')
      }
      try {
        emailHtml = await renderAsync(
          React.createElement(PaymentConfirmationEmail, {
            customerName: data.customerName,
            orderNumber: data.orderNumber,
            invoiceNumber: data.invoiceNumber,
            paymentAmount: data.paymentAmount,
            currency: data.currency || 'USD',
            paymentMethod: data.paymentMethod,
            transactionId: data.transactionId,
            orderItems: data.orderItems || [],
            receiptDownloadUrl: data.receiptDownloadUrl,
            paymentDate: data.paymentDate,
          })
        )
      } catch (renderError: any) {
        console.error('Failed to render payment confirmation template:', renderError)
        emailHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <div style="background: #4ade80; color: white; padding: 20px; text-align: center; border-radius: 6px; margin-bottom: 20px;">
                <h1 style="margin: 0;">Payment Confirmed!</h1>
                <p style="margin: 10px 0 0;">Thank you for your payment, ${data.customerName}</p>
              </div>
              <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <p><strong>Order #:</strong> ${data.orderNumber}</p>
                <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
                <p><strong>Amount Paid:</strong> ${data.currency || 'USD'} ${data.paymentAmount.toFixed(2)}</p>
                <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
                <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
                <p><strong>Payment Date:</strong> ${data.paymentDate}</p>
              </div>
              ${data.receiptDownloadUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.receiptDownloadUrl}" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Download Receipt (PDF)
                  </a>
                </div>
              ` : ''}
              <p>Your payment has been processed successfully. Thank you for your business!</p>
            </body>
          </html>
        `
      }
      subject = `Payment Confirmed - ${data.orderNumber}`
      toEmail = data.customerEmail
      break

    case 'invoice':
      if (!data.customerName || !data.orderNumber || !data.invoiceNumber) {
        throw new Error('Missing required invoice data')
      }
      try {
        emailHtml = await renderAsync(
          React.createElement(InvoiceEmail, {
            customerName: data.customerName,
            orderNumber: data.orderNumber,
            invoiceNumber: data.invoiceNumber,
            orderItems: data.orderItems || [],
            subtotal: data.subtotal || 0,
            deliveryFee: data.deliveryFee || 0,
            totalAmount: data.totalAmount,
            dueDate: data.dueDate,
            paymentStatus: data.paymentStatus,
            paymentUrl: data.paymentUrl,
          })
        )
      } catch (renderError: any) {
        emailHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>Invoice ${data.invoiceNumber}</h1>
              <p>Dear ${data.customerName},</p>
              <p>Please find your invoice for order ${data.orderNumber} below.</p>
              <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
                <p><strong>Order #:</strong> ${data.orderNumber}</p>
                <p><strong>Due Date:</strong> ${data.dueDate}</p>
                <p><strong>Status:</strong> ${data.paymentStatus}</p>
              </div>
              ${data.paymentUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.paymentUrl}" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Pay Invoice Now - $${data.totalAmount.toFixed(2)}
                  </a>
                </div>
              ` : ''}
              <div style="border: 1px solid #eee; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h2>Order Items</h2>
                ${(data.orderItems || []).map((item: any) => `
                  <p>${item.name} - Qty: ${item.quantity} - $${item.price.toFixed(2)}</p>
                `).join('')}
                <hr style="margin: 20px 0;">
                <p><strong>Subtotal: $${(data.subtotal || 0).toFixed(2)}</strong></p>
                <p><strong>Delivery Fee: $${(data.deliveryFee || 0).toFixed(2)}</strong></p>
                <p><strong>Total Amount: $${data.totalAmount.toFixed(2)}</strong></p>
              </div>
              <p>Thank you for your business!</p>
            </body>
          </html>
        `
      }
      subject = `Invoice ${data.invoiceNumber} - ${data.orderNumber}`
      toEmail = data.customerEmail
      break

    default:
      throw new Error(`Unknown email type: ${type}`)
  }

  return { emailHtml, subject, toEmail }
}
