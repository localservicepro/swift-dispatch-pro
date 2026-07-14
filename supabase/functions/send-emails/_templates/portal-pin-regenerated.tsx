import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PortalPinRegeneratedEmailProps {
  customerName: string;
  pin: string;
  expiresAt: string;
}

export const PortalPinRegeneratedEmail = ({
  customerName,
  pin,
  expiresAt,
}: PortalPinRegeneratedEmailProps) => {
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Html>
      <Head />
      <Preview>Your Portal PIN Has Been Reset</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Portal PIN Reset</Heading>
          
          <Text style={text}>Hi {customerName},</Text>
          
          <Text style={text}>
            Your customer portal PIN code has been reset. Your new PIN is:
          </Text>

          <Section style={pinContainer}>
            <Text style={pinCode}>{pin}</Text>
          </Section>

          <Section style={warningBox}>
            <Text style={warningText}>
              ⚠️ Your previous PIN is no longer valid
            </Text>
          </Section>

          <Text style={text}>
            Use this new PIN to access your customer portal.
          </Text>

          <Hr style={hr} />

          <Section style={infoSection}>
            <Text style={infoTitle}>Important Information:</Text>
            <Text style={infoText}>
              • This PIN expires on: <strong>{expiryDate}</strong>
            </Text>
            <Text style={infoText}>
              • Keep this PIN secure and do not share it with anyone
            </Text>
            <Text style={infoText}>
              • You can also use the magic link option if you prefer
            </Text>
            <Text style={infoText}>
              • After 5 failed attempts, your account will be locked for 30 minutes
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            If you didn't request this PIN reset, please contact your account manager immediately. This could indicate unauthorized access to your account.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PortalPinRegeneratedEmail;

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
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const pinContainer = {
  backgroundColor: '#f4f4f4',
  borderRadius: '8px',
  margin: '32px 40px',
  padding: '24px',
  textAlign: 'center' as const,
  border: '2px solid #e0e0e0',
};

const pinCode = {
  color: '#000',
  fontSize: '48px',
  fontWeight: 'bold',
  letterSpacing: '8px',
  margin: '0',
  fontFamily: 'monospace',
};

const warningBox = {
  backgroundColor: '#fff3cd',
  borderRadius: '6px',
  border: '1px solid #ffc107',
  margin: '24px 40px',
  padding: '16px',
  textAlign: 'center' as const,
};

const warningText = {
  color: '#856404',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
};

const infoSection = {
  padding: '0 40px',
  margin: '24px 0',
};

const infoTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const infoText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
  margin: '32px 0 0 0',
};