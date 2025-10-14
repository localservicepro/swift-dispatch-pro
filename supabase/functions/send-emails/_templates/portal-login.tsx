import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PortalLoginEmailProps {
  contactName: string;
  businessName: string;
  magicLink: string;
  expiresIn: string;
}

export const PortalLoginEmail = ({
  contactName,
  businessName,
  magicLink,
  expiresIn = '1 hour'
}: PortalLoginEmailProps) => (
  <Html>
    <Head />
    <Preview>Your Customer Portal Login Link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔐 Customer Portal Login</Heading>
        
        <Text style={text}>Hi {contactName},</Text>
        
        <Text style={text}>
          Click the button below to access your customer portal for <strong>{businessName}</strong>.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={magicLink}>
            Login to Portal
          </Button>
        </Section>

        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        <Text style={linkText}>{magicLink}</Text>

        <Section style={infoBox}>
          <Text style={infoText}>
            🔒 <strong>Security:</strong> This link expires in {expiresIn} and can only be used once.
          </Text>
        </Section>

        <Text style={text}>
          If you didn't request this login link, you can safely ignore this email.
        </Text>

        <Text style={footer}>
          Best regards,<br />
          The {businessName} Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PortalLoginEmail;

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
