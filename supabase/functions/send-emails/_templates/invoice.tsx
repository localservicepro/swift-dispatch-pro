
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
} from 'npm:@react-email/components@0.0.15'
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
  fuelSurcharge?: number
  totalAmount: number
  dueDate: string
  paymentStatus: string
  paymentUrl?: string
}

export const InvoiceEmail = ({
  customerName,
  orderNumber,
  invoiceNumber,
  orderItems,
  subtotal,
  deliveryFee,
  fuelSurcharge = 0,
  totalAmount,
  dueDate,
  paymentStatus,
  paymentUrl,
}: InvoiceEmailProps) => {
  return (
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
            <Text style={invoiceNumber}>Invoice #: <strong>{invoiceNumber}</strong></Text>
            <Text style={text}>Order #: {orderNumber}</Text>
            <Text style={text}>Due Date: <strong>{dueDate}</strong></Text>
            <Text style={text}>Status: <strong>{paymentStatus}</strong></Text>
          </Section>

          {paymentStatus === 'Pending' && paymentUrl && (
            <Section style={paymentButtonSection}>
              <Button href={paymentUrl} style={paymentButton}>
                Pay Invoice Now - ${totalAmount.toFixed(2)}
              </Button>
              <Text style={paymentNote}>
                Click the button above to securely pay your invoice using our payment system.
              </Text>
            </Section>
          )}

          <Section style={itemsSection}>
            <Heading style={h2}>Order Items</Heading>
            
            {orderItems.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column>
                  <Text style={itemText}>{item.name}</Text>
                </Column>
                <Column>
                  <Text style={itemText}>Qty: {item.quantity}</Text>
                </Column>
                <Column>
                  <Text style={itemText}>${item.price.toFixed(2)}</Text>
                </Column>
              </Row>
            ))}
            
            <Row style={totalRow}>
              <Column>
                <Text style={totalText}>Subtotal: ${subtotal.toFixed(2)}</Text>
              </Column>
            </Row>
            
            <Row style={totalRow}>
              <Column>
                <Text style={totalText}>Delivery Fee: ${(deliveryFee - fuelSurcharge).toFixed(2)}</Text>
              </Column>
            </Row>

            <Row style={totalRow}>
              <Column>
                <Text style={totalText}>Fuel Surcharge: ${fuelSurcharge.toFixed(2)}</Text>
              </Column>
            </Row>
            
            <Row style={totalRow}>
              <Column>
                <Text style={totalTextBold}>Total Amount: ${totalAmount.toFixed(2)}</Text>
              </Column>
            </Row>
          </Section>

          {paymentStatus === 'Pending' && (
            <Section style={paymentSection}>
              <Text style={text}>
                <strong>Payment is due by {dueDate}.</strong> Please use the payment button above to complete your payment securely.
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
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  marginBottom: '10px',
}

const itemsSection = {
  border: '1px solid #eee',
  borderRadius: '5px',
  padding: '20px',
  margin: '20px 0',
}

const itemRow = {
  borderBottom: '1px solid #eee',
  padding: '8px 0',
}

const itemText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0',
}

const totalRow = {
  padding: '8px 0',
  marginTop: '10px',
}

const totalText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0',
  fontWeight: 'bold',
}

const totalTextBold = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  fontWeight: 'bold',
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

const paymentButtonSection = {
  textAlign: 'center' as const,
  margin: '40px 0',
  padding: '30px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
}

const paymentButton = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  margin: '0 auto',
}

const paymentNote = {
  fontSize: '14px',
  color: '#64748b',
  textAlign: 'center' as const,
  marginTop: '16px',
  marginBottom: '0',
}
