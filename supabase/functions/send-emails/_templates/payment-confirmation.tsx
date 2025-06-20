
import {
  Body,
  Button,
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

interface PaymentConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  invoiceNumber: string;
  paymentAmount: number;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  orderItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  receiptDownloadUrl?: string;
  paymentDate: string;
}

export const PaymentConfirmationEmail = ({
  customerName,
  orderNumber,
  invoiceNumber,
  paymentAmount,
  currency = 'USD',
  paymentMethod,
  transactionId,
  orderItems = [],
  receiptDownloadUrl,
  paymentDate,
}: PaymentConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Payment Confirmed - Thank you for your payment!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Payment Confirmed!</Heading>
          <Text style={subtitle}>
            Thank you for your payment, {customerName}. Your transaction has been processed successfully.
          </Text>
        </Section>

        <Section style={paymentDetails}>
          <Heading style={h2}>Payment Details</Heading>
          <Row style={detailRow}>
            <Column style={labelColumn}>
              <Text style={label}>Order Number:</Text>
            </Column>
            <Column style={valueColumn}>
              <Text style={value}>{orderNumber}</Text>
            </Column>
          </Row>
          <Row style={detailRow}>
            <Column style={labelColumn}>
              <Text style={label}>Invoice Number:</Text>
            </Column>
            <Column style={valueColumn}>
              <Text style={value}>{invoiceNumber}</Text>
            </Column>
          </Row>
          <Row style={detailRow}>
            <Column style={labelColumn}>
              <Text style={label}>Payment Amount:</Text>
            </Column>
            <Column style={valueColumn}>
              <Text style={value}>{currency} {paymentAmount.toFixed(2)}</Text>
            </Column>
          </Row>
          <Row style={detailRow}>
            <Column style={labelColumn}>
              <Text style={label}>Payment Method:</Text>
            </Column>
            <Column style={valueColumn}>
              <Text style={value}>{paymentMethod}</Text>
            </Column>
          </Row>
          <Row style={detailRow}>
            <Column style={labelColumn}>
              <Text style={label}>Transaction ID:</Text>
            </Column>
            <Column style={valueColumn}>
              <Text style={value}>{transactionId}</Text>
            </Column>
          </Row>
          <Row style={detailRow}>
            <Column style={labelColumn}>
              <Text style={label}>Payment Date:</Text>
            </Column>
            <Column style={valueColumn}>
              <Text style={value}>{paymentDate}</Text>
            </Column>
          </Row>
        </Section>

        {orderItems.length > 0 && (
          <Section style={orderSummary}>
            <Heading style={h2}>Order Summary</Heading>
            {orderItems.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column style={itemNameColumn}>
                  <Text style={itemText}>{item.name}</Text>
                </Column>
                <Column style={itemQtyColumn}>
                  <Text style={itemText}>x{item.quantity}</Text>
                </Column>
                <Column style={itemPriceColumn}>
                  <Text style={itemText}>{currency} {item.price.toFixed(2)}</Text>
                </Column>
              </Row>
            ))}
          </Section>
        )}

        {receiptDownloadUrl && (
          <Section style={downloadSection}>
            <Heading style={h2}>Download Your Receipt</Heading>
            <Text style={downloadText}>
              Click the button below to download a PDF copy of your receipt for your records.
            </Text>
            <Button
              href={receiptDownloadUrl}
              style={downloadButton}
            >
              Download Receipt (PDF)
            </Button>
          </Section>
        )}

        <Section style={footer}>
          <Text style={footerText}>
            If you have any questions about this payment, please contact our support team.
          </Text>
          <Text style={footerText}>
            Thank you for your business!
          </Text>
          <Text style={companyText}>
            SwiftDispatch Pro
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#4ade80',
  color: '#ffffff',
}

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

const h2 = {
  color: '#334155',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '32px 0 16px',
}

const subtitle = {
  color: '#ffffff',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  textAlign: 'center' as const,
}

const paymentDetails = {
  padding: '0 24px',
}

const detailRow = {
  marginBottom: '8px',
}

const labelColumn = {
  width: '40%',
  verticalAlign: 'top' as const,
}

const valueColumn = {
  width: '60%',
  verticalAlign: 'top' as const,
}

const label = {
  color: '#64748b',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
}

const value = {
  color: '#1e293b',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
}

const orderSummary = {
  padding: '0 24px',
  marginTop: '32px',
}

const itemRow = {
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: '8px',
  marginBottom: '8px',
}

const itemNameColumn = {
  width: '50%',
  verticalAlign: 'top' as const,
}

const itemQtyColumn = {
  width: '20%',
  verticalAlign: 'top' as const,
  textAlign: 'center' as const,
}

const itemPriceColumn = {
  width: '30%',
  verticalAlign: 'top' as const,
  textAlign: 'right' as const,
}

const itemText = {
  color: '#334155',
  fontSize: '14px',
  margin: '0',
}

const downloadSection = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#f8fafc',
  margin: '32px 0',
}

const downloadText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 24px',
}

const downloadButton = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const footer = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e2e8f0',
  marginTop: '32px',
}

const footerText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
}

const companyText = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '16px 0 0',
}

export default PaymentConfirmationEmail
