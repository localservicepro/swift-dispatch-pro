
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface OrderConfirmationEmailProps {
  customerName: string
  orderNumber: string
  orderItems: Array<{
    name: string
    quantity: number
    price: number
  }>
  totalAmount: number
  deliveryAddress: string
  deliveryDate?: string
  deliveryTime?: string
  specialInstructions?: string
}

export const OrderConfirmationEmail = ({
  customerName,
  orderNumber,
  orderItems,
  totalAmount,
  deliveryAddress,
  deliveryDate,
  deliveryTime,
  specialInstructions,
}: OrderConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Your order {orderNumber} has been confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Order Confirmation</Heading>
        <Text style={text}>Dear {customerName},</Text>
        <Text style={text}>
          Thank you for your order! We've received your order and it's being prepared for delivery.
        </Text>
        
        <Section style={orderDetails}>
          <Heading style={h2}>Order Details</Heading>
          <Text style={orderNumber}>Order Number: <strong>{orderNumber}</strong></Text>
          
          {orderItems.map((item, index) => (
            <Row key={index} style={itemRow}>
              <Column style={itemName}>{item.name}</Column>
              <Column style={itemQuantity}>Qty: {item.quantity}</Column>
              <Column style={itemPrice}>${item.price.toFixed(2)}</Column>
            </Row>
          ))}
          
          <Row style={totalRow}>
            <Column style={totalLabel}>Total Amount:</Column>
            <Column style={totalAmount}><strong>${totalAmount.toFixed(2)}</strong></Column>
          </Row>
        </Section>

        <Section style={deliverySection}>
          <Heading style={h2}>Delivery Information</Heading>
          <Text style={text}><strong>Address:</strong> {deliveryAddress}</Text>
          {deliveryDate && (
            <Text style={text}><strong>Delivery Date:</strong> {deliveryDate}</Text>
          )}
          {deliveryTime && (
            <Text style={text}><strong>Delivery Time:</strong> {deliveryTime}</Text>
          )}
          {specialInstructions && (
            <Text style={text}><strong>Special Instructions:</strong> {specialInstructions}</Text>
          )}
        </Section>

        <Text style={footer}>
          If you have any questions about your order, please contact us.
          <br />
          Thank you for choosing our delivery service!
        </Text>
      </Container>
    </Body>
  </Html>
)

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

const orderDetails = {
  border: '1px solid #eee',
  borderRadius: '5px',
  padding: '20px',
  margin: '20px 0',
}

const orderNumber = {
  ...text,
  fontSize: '16px',
  marginBottom: '20px',
}

const itemRow = {
  borderBottom: '1px solid #eee',
  padding: '10px 0',
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
  fontWeight: 'bold',
}

const deliverySection = {
  margin: '20px 0',
}

const footer = {
  color: '#666',
  fontSize: '12px',
  lineHeight: '18px',
  marginTop: '40px',
}
