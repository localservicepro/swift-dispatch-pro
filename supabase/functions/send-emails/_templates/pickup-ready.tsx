import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PickupReadyEmailProps {
  customerName: string;
  orderNumber: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  pickupAddress: string;
  businessName?: string;
  businessHours?: string;
  specialInstructions?: string;
  contactPhone?: string;
}

export const PickupReadyEmail = ({
  customerName,
  orderNumber,
  orderItems,
  totalAmount,
  pickupAddress,
  businessName = 'SwiftDispatch Pro',
  businessHours = 'Monday - Friday: 8:00 AM - 5:00 PM',
  specialInstructions,
  contactPhone,
}: PickupReadyEmailProps) => (
  <Html>
    <Head />
    <Preview>Your order {orderNumber} is ready for pickup!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 Your Order is Ready for Pickup!</Heading>
        
        <Text style={text}>Hi {customerName},</Text>
        
        <Text style={text}>
          Great news! Your order <strong>{orderNumber}</strong> has been prepared and is ready for collection.
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightText}>
            <strong>Pickup Location:</strong>
          </Text>
          <Text style={addressText}>{pickupAddress}</Text>
          
          <Text style={highlightText}>
            <strong>Business Hours:</strong>
          </Text>
          <Text style={addressText}>{businessHours}</Text>
        </Section>

        <Hr style={hr} />

        <Heading style={h2}>Order Summary</Heading>
        
        {orderItems.map((item, index) => (
          <Section key={index} style={orderItem}>
            <Text style={itemText}>
              <strong>{item.name}</strong>
              <br />
              Quantity: {item.quantity} × ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}
            </Text>
          </Section>
        ))}

        <Hr style={hr} />

        <Text style={totalText}>
          <strong>Total Amount: ${totalAmount.toFixed(2)}</strong>
        </Text>

        {specialInstructions && (
          <>
            <Hr style={hr} />
            <Section style={instructionsBox}>
              <Text style={highlightText}>
                <strong>Special Instructions:</strong>
              </Text>
              <Text style={text}>{specialInstructions}</Text>
            </Section>
          </>
        )}

        <Hr style={hr} />

        <Text style={text}>
          Please bring a valid ID and your order number when collecting your order.
        </Text>

        {contactPhone && (
          <Text style={text}>
            If you have any questions, please contact us at <Link href={`tel:${contactPhone}`} style={link}>{contactPhone}</Link>
          </Text>
        )}

        <Text style={footer}>
          Thank you for your business!
          <br />
          {businessName}
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PickupReadyEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
  padding: '0 48px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
};

const highlightBox = {
  backgroundColor: '#dbeafe',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 48px',
};

const highlightText = {
  color: '#1e40af',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const addressText = {
  color: '#1f2937',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const instructionsBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 48px',
};

const orderItem = {
  padding: '8px 48px',
};

const itemText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 48px',
};

const totalText = {
  color: '#1f2937',
  fontSize: '18px',
  lineHeight: '26px',
  padding: '0 48px',
  textAlign: 'right' as const,
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '24px 48px 0',
  textAlign: 'center' as const,
};
