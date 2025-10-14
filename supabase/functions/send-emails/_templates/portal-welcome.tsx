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
  Button,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PortalWelcomeEmailProps {
  contactName: string;
  businessName: string;
  magicLink: string;
  expiresIn: string;
}

export const PortalWelcomeEmail = ({
  contactName,
  businessName,
  magicLink,
  expiresIn = '1 hour'
}: PortalWelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to your Customer Portal - Access Granted</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 Welcome to Your Customer Portal!</Heading>
        
        <Text style={text}>Hi {contactName},</Text>
        
        <Text style={text}>
          Great news! Your customer portal access has been activated for <strong>{businessName}</strong>.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={magicLink}>
            Access Your Portal
          </Button>
        </Section>

        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        <Text style={linkText}>{magicLink}</Text>

        <Section style={featuresSection}>
          <Heading style={h2}>What you can do in your portal:</Heading>
          <Text style={featureItem}>✓ View all your orders and their status</Text>
          <Text style={featureItem}>✓ Track deliveries in real-time</Text>
          <Text style={featureItem}>✓ Manage your contacts</Text>
          <Text style={featureItem}>✓ Download invoices and receipts</Text>
          <Text style={featureItem}>✓ Create new orders</Text>
          <Text style={featureItem}>✓ View your credit balance</Text>
        </Section>

        <Section style={infoBox}>
          <Text style={infoText}>
            🔒 <strong>Security Note:</strong> This login link expires in {expiresIn} and can only be used once.
            For future logins, simply request a new magic link - no password needed!
          </Text>
        </Section>

        <Text style={text}>
          If you have any questions or need assistance, please don't hesitate to reach out to your account manager.
        </Text>

        <Text style={footer}>
          Best regards,<br />
          The {businessName} Team
        </Text>

        <Text style={footerNote}>
          If you didn't request this access, please contact us immediately.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PortalWelcomeEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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
  padding: '0 40px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 40px',
};

const linkText = {
  color: '#067df7',
  fontSize: '14px',
  margin: '16px 40px',
  wordBreak: 'break-all' as const,
};

const buttonContainer = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#067df7',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const featuresSection = {
  margin: '32px 40px',
  padding: '24px',
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
};

const featureItem = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const infoBox = {
  margin: '32px 40px',
  padding: '16px',
  backgroundColor: '#fff3cd',
  borderRadius: '8px',
  border: '1px solid #ffc107',
};

const infoText = {
  color: '#856404',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 40px 16px',
};

const footerNote = {
  color: '#999',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '16px 40px',
  textAlign: 'center' as const,
};
