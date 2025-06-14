
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface InvoiceEmailProps {
  customerName: string
  orderNumber: string
  invoiceNumber: string
  orderItems: Array<{
    name: string
    quantity: number
    price: number
  }>
  subtotal: number
  deliveryFee: number
  totalAmount: number
  dueDate: string
  paymentStatus: string
  orderId?: string
}

export const InvoiceEmail = ({
  customerName,
  orderNumber,
  invoiceNumber,
  orderItems,
  subtotal,
  deliveryFee,
  totalAmount,
  dueDate,
  paymentStatus,
  orderId,
}: InvoiceEmailProps) => (
  <Html>
    <Head />
    <Preview>Invoice {invoiceNumber} for order {orderNumber}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Invoice</Heading>
        <Text style={text}>Dear {customerName},</Text>
        <Text style={text}>
          Please find your invoice for order {orderNumber} below.
        </Text>
        
        <Section style={invoiceHeader}>
          <Row>
            <Column>
              <Text style={invoiceNumber}>Invoice #: <strong>{invoiceNumber}</strong></Text>
              <Text style={text}>Order #: {orderNumber}</Text>
            </Column>
            <Column style={dueDateColumn}>
              <Text style={text}>Due Date: <strong>{dueDate}</strong></Text>
              <Text style={text}>Status: <strong style={getStatusColor(paymentStatus)}>{paymentStatus}</strong></Text>
            </Column>
          </Row>
        </Section>

        {paymentStatus === 'pending' && orderId && (
          <Section style={paymentButtonSection}>
            <Button
              href={`https://wntcxbxitsanbyrtfhwv.supabase.co/functions/v1/create-invoice-payment?order_id=${orderId}`}
              style={paymentButton}
            >
              Pay Invoice Now - ${totalAmount.toFixed(2)}
            </Button>
            <Text style={paymentText}>
              Click the button above to pay your invoice securely with Stripe
            </Text>
          </Section>
        )}

        <Section style={itemsSection}>
          <Heading style={h2}>Order Items</Heading>
          <Row style={headerRow}>
            <Column style={itemHeaderName}>Item</Column>
            <Column style={itemHeaderQuantity}>Qty</Column>
            <Column style={itemHeaderPrice}>Price</Column>
          </Row>
          
          {orderItems.map((item, index) => (
            <Row key={index} style={itemRow}>
              <Column style={itemName}>{item.name}</Column>
              <Column style={itemQuantity}>{item.quantity}</Column>
              <Column style={itemPrice}>${item.price.toFixed(2)}</Column>
            </Row>
          ))}
          
          <Row style={subtotalRow}>
            <Column style={totalLabel}>Subtotal:</Column>
            <Column style={totalAmount}>${subtotal.toFixed(2)}</Column>
          </Row>
          
          <Row style={deliveryRow}>
            <Column style={totalLabel}>Delivery Fee:</Column>
            <Column style={totalAmount}>${deliveryFee.toFixed(2)}</Column>
          </Row>
          
          <Row style={totalRow}>
            <Column style={totalLabel}>Total Amount:</Column>
            <Column style={totalAmount}><strong>${totalAmount.toFixed(2)}</strong></Column>
          </Row>
        </Section>

        {paymentStatus === 'pending' && (
          <Section style={paymentSection}>
            <Text style={text}>
              <strong>Payment is due by {dueDate}.</strong> Please click the "Pay Invoice Now" button above to pay securely online, or ensure payment is made to avoid any delays in future orders.
            </Text>
          </Section>
        )}

        <Text style={footer}>
          Thank you for your business! If you have any questions about this invoice, please contact us.
        </Text>
      </Container>
    </Body>
  </Html>
)

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return { color: '#16a34a' }
    case 'pending':
      return { color: '#ea580c' }
    case 'overdue':
      return { color: '#dc2626' }
    default:
      return { color: '#333' }
  }
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
}

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 10px 0',
}

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
}

const invoiceHeader = {
  border: '1px solid #eee',
  borderRadius: '5px',
  padding: '20px',
  margin: '20px 0',
  backgroundColor: '#f9f9f9',
}

const invoiceNumber = {
  ...text,
  fontSize: '16px',
  marginBottom: '10px',
}

const dueDateColumn = {
  textAlign: 'right' as const,
}

const paymentButtonSection = {
  textAlign: 'center' as const,
  margin: '30px 0',
  padding: '20px',
  backgroundColor: '#f8f9ff',
  border: '1px solid #e0e7ff',
  borderRadius: '8px',
}

const paymentButton = {
  backgroundColor: '#4f46e5',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  margin: '10px 0',
  cursor: 'pointer',
}

const paymentText = {
  ...text,
  fontSize: '12px',
  color: '#6b7280',
  textAlign: 'center' as const,
  margin: '10px 0 0 0',
}

const itemsSection = {
  border: '1px solid #eee',
  borderRadius: '5px',
  padding: '20px',
  margin: '20px 0',
}

const headerRow = {
  borderBottom: '2px solid #333',
  padding: '10px 0',
  marginBottom: '10px',
}

const itemHeaderName = {
  ...text,
  margin: '0',
  fontWeight: 'bold',
}

const itemHeaderQuantity = {
  ...text,
  margin: '0',
  textAlign: 'center' as const,
  fontWeight: 'bold',
}

const itemHeaderPrice = {
  ...text,
  margin: '0',
  textAlign: 'right' as const,
  fontWeight: 'bold',
}

const itemRow = {
  borderBottom: '1px solid #eee',
  padding: '8px 0',
}

const itemName = {
  ...text,
  margin: '0',
}

const itemQuantity = {
  ...text,
  margin: '0',
  textAlign: 'center' as const,
}

const itemPrice = {
  ...text,
  margin: '0',
  textAlign: 'right' as const,
}

const subtotalRow = {
  padding: '8px 0',
  marginTop: '10px',
}

const deliveryRow = {
  padding: '8px 0',
}

const totalRow = {
  borderTop: '2px solid #333',
  padding: '10px 0',
  marginTop: '10px',
}

const totalLabel = {
  ...text,
  margin: '0',
  fontWeight: 'bold',
}

const totalAmount = {
  ...text,
  margin: '0',
  textAlign: 'right' as const,
  fontSize: '16px',
}

const paymentSection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '5px',
  padding: '20px',
  margin: '20px 0',
}

const footer = {
  color: '#666',
  fontSize: '12px',
  lineHeight: '18px',
  marginTop: '40px',
}
