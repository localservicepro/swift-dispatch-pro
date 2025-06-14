
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface DeliveryStatusUpdateEmailProps {
  customerName: string
  orderNumber: string
  oldStatus: string
  newStatus: string
  driverName?: string
  notes?: string
  estimatedDeliveryTime?: string
}

export const DeliveryStatusUpdateEmail = ({
  customerName,
  orderNumber,
  oldStatus,
  newStatus,
  driverName,
  notes,
  estimatedDeliveryTime,
}: DeliveryStatusUpdateEmailProps) => {
  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'preparing':
        return 'Your order is being prepared'
      case 'loading':
        return 'Your order is being loaded for delivery'
      case 'en_route':
        return 'Your order is on the way'
      case 'delivered':
        return 'Your order has been delivered'
      default:
        return `Order status: ${status}`
    }
  }

  return (
    <Html>
      <Head />
      <Preview>Order {orderNumber} status update: {getStatusMessage(newStatus)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Delivery Update</Heading>
          <Text style={text}>Dear {customerName},</Text>
          <Text style={text}>
            We have an update on your order <strong>{orderNumber}</strong>.
          </Text>
          
          <Section style={statusSection}>
            <Heading style={h2}>Status Update</Heading>
            <Text style={statusText}>
              <strong>{getStatusMessage(newStatus)}</strong>
            </Text>
            
            {driverName && newStatus === 'en_route' && (
              <Text style={text}>
                Your driver <strong>{driverName}</strong> is on the way to deliver your order.
              </Text>
            )}
            
            {estimatedDeliveryTime && (
              <Text style={text}>
                <strong>Estimated delivery time:</strong> {estimatedDeliveryTime}
              </Text>
            )}
            
            {notes && (
              <Text style={text}>
                <strong>Additional notes:</strong> {notes}
              </Text>
            )}
          </Section>

          {newStatus === 'delivered' && (
            <Section style={thankYouSection}>
              <Text style={text}>
                Thank you for choosing our delivery service! We hope you're satisfied with your order.
              </Text>
            </Section>
          )}

          <Text style={footer}>
            If you have any questions about your delivery, please contact us.
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

const statusSection = {
  border: '1px solid #eee',
  borderRadius: '5px',
  padding: '20px',
  margin: '20px 0',
  backgroundColor: '#f9f9f9',
}

const statusText = {
  ...text,
  fontSize: '16px',
  color: '#2563eb',
  marginBottom: '15px',
}

const thankYouSection = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bfdbfe',
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
