
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

interface BatchInvoiceEmailProps {
  customerName: string
  masterOrderNumber: string
  invoiceNumber: string
  allOrders: Array<{
    orderNumber: string
    deliveryAddress: string
    orderItems: Array<{
      name: string
      quantity: number
      price: number
    }>
    subtotal: number
    deliveryFee: number
    totalAmount: number
    deliveryDate?: string
    deliveryTime?: string
  }>
  grandTotal: number
  dueDate: string
  paymentStatus: string
  paymentUrl?: string
}

export const BatchInvoiceEmail = ({
  customerName,
  masterOrderNumber,
  invoiceNumber,
  allOrders,
  grandTotal,
  dueDate,
  paymentStatus,
  paymentUrl,
}: BatchInvoiceEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Batch Invoice {invoiceNumber} for split order {masterOrderNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Batch Invoice</Heading>
          <Text style={text}>Dear {customerName},</Text>
          <Text style={text}>
            Please find your consolidated invoice for split order {masterOrderNumber} below. 
            This invoice covers all deliveries to multiple addresses.
          </Text>
          
          <Section style={invoiceHeader}>
            <Text style={invoiceNumber}>Invoice #: <strong>{invoiceNumber}</strong></Text>
            <Text style={text}>Master Order #: {masterOrderNumber}</Text>
            <Text style={text}>Due Date: <strong>{dueDate}</strong></Text>
            <Text style={text}>Status: <strong>{paymentStatus}</strong></Text>
          </Section>

          {paymentStatus === 'Pending' && paymentUrl && (
            <Section style={paymentButtonSection}>
              <Button href={paymentUrl} style={paymentButton}>
                Pay Invoice Now - ${grandTotal.toFixed(2)}
              </Button>
              <Text style={paymentNote}>
                Click the button above to securely pay your consolidated invoice.
              </Text>
            </Section>
          )}

          <Section style={ordersSection}>
            <Heading style={h2}>Delivery Breakdown</Heading>
            
            {allOrders.map((order, index) => (
              <Section key={index} style={orderSection}>
                <Heading style={h3}>{order.orderNumber}</Heading>
                <Text style={addressText}>
                  <strong>Delivery Address:</strong> {order.deliveryAddress}
                </Text>
                {order.deliveryDate && (
                  <Text style={addressText}>
                    <strong>Delivery Date:</strong> {order.deliveryDate} {order.deliveryTime && `at ${order.deliveryTime}`}
                  </Text>
                )}
                
                <div style={itemsContainer}>
                  {order.orderItems.map((item, itemIndex) => (
                    <Row key={itemIndex} style={itemRow}>
                      <Column style={{ width: '60%' }}>
                        <Text style={itemText}>{item.name}</Text>
                      </Column>
                      <Column style={{ width: '20%' }}>
                        <Text style={itemText}>Qty: {item.quantity}</Text>
                      </Column>
                      <Column style={{ width: '20%' }}>
                        <Text style={itemText}>${item.price.toFixed(2)}</Text>
                      </Column>
                    </Row>
                  ))}
                </div>
                
                <Row style={totalRow}>
                  <Column>
                    <Text style={totalText}>Subtotal: ${order.subtotal.toFixed(2)}</Text>
                  </Column>
                </Row>
                
                <Row style={totalRow}>
                  <Column>
                    <Text style={totalText}>Delivery Fee: ${order.deliveryFee.toFixed(2)}</Text>
                  </Column>
                </Row>
                
                <Row style={totalRow}>
                  <Column>
                    <Text style={orderTotalText}>Order Total: ${order.totalAmount.toFixed(2)}</Text>
                  </Column>
                </Row>
              </Section>
            ))}
            
            <Section style={grandTotalSection}>
              <Row style={grandTotalRow}>
                <Column>
                  <Text style={grandTotalText}>GRAND TOTAL: ${grandTotal.toFixed(2)}</Text>
                </Column>
              </Row>
            </Section>
          </Section>

          {paymentStatus === 'Pending' && (
            <Section style={paymentSection}>
              <Text style={text}>
                <strong>Payment is due by {dueDate}.</strong> Please use the payment button above to complete your payment securely for all deliveries.
              </Text>
            </Section>
          )}

          <Text style={footer}>
            Thank you for your business! This consolidated invoice covers all items being delivered to your multiple addresses. 
            If you have any questions, please contact us.
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

const h3 = {
  color: '#2563eb',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '15px 0 5px 0',
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

const ordersSection = {
  border: '1px solid #eee',
  borderRadius: '5px',
  padding: '20px',
  margin: '20px 0',
}

const orderSection = {
  border: '1px solid #ddd',
  borderRadius: '5px',
  padding: '15px',
  margin: '15px 0',
  backgroundColor: '#fafafa',
}

const addressText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '5px 0',
}

const itemsContainer = {
  margin: '10px 0',
}

const itemRow = {
  borderBottom: '1px solid #eee',
  padding: '5px 0',
}

const itemText = {
  color: '#333',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
}

const totalRow = {
  padding: '5px 0',
  marginTop: '5px',
}

const totalText = {
  color: '#333',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  fontWeight: 'bold',
}

const orderTotalText = {
  color: '#2563eb',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  fontWeight: 'bold',
}

const grandTotalSection = {
  backgroundColor: '#f0f9ff',
  border: '2px solid #2563eb',
  borderRadius: '5px',
  padding: '15px',
  margin: '20px 0',
}

const grandTotalRow = {
  textAlign: 'center' as const,
}

const grandTotalText = {
  color: '#1e40af',
  fontSize: '18px',
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
