import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components'
import * as React from 'react'

interface InvoiceEmailProps {
  invoiceNumber: string
  clientName: string
  issueDate: string
  dueDate: string
  totalAmount: string
  balanceDue: string
  lineItems: Array<{
    description: string
    amount: string
  }>
  companyName?: string
  companyEmail?: string
  paymentUrl?: string
}

export const InvoiceEmail = ({
  invoiceNumber = 'INV-202601-0001',
  clientName = 'Acme Corporation',
  issueDate = 'January 15, 2026',
  dueDate = 'February 14, 2026',
  totalAmount = '$2,500.00',
  balanceDue = '$2,500.00',
  lineItems = [
    { description: 'Monthly Cleaning Service', amount: '$2,500.00' },
  ],
  companyName = 'Urban Simple',
  companyEmail = 'billing@urbansimple.net',
  paymentUrl = '#',
}: InvoiceEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Invoice {invoiceNumber} from {companyName} - {balanceDue} due by{' '}
        {dueDate}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={heading}>{companyName}</Heading>
            <Text style={subheading}>Invoice</Text>
          </Section>

          {/* Invoice Details */}
          <Section style={box}>
            <Row>
              <Column style={detailsColumn}>
                <Text style={label}>Invoice Number</Text>
                <Text style={value}>{invoiceNumber}</Text>
              </Column>
              <Column style={detailsColumn}>
                <Text style={label}>Issue Date</Text>
                <Text style={value}>{issueDate}</Text>
              </Column>
            </Row>
            <Row style={{ marginTop: '12px' }}>
              <Column style={detailsColumn}>
                <Text style={label}>Bill To</Text>
                <Text style={value}>{clientName}</Text>
              </Column>
              <Column style={detailsColumn}>
                <Text style={label}>Due Date</Text>
                <Text style={value}>{dueDate}</Text>
              </Column>
            </Row>
          </Section>

          {/* Line Items */}
          <Section style={box}>
            <Row style={tableHeader}>
              <Column style={{ width: '70%' }}>
                <Text style={tableHeaderText}>Description</Text>
              </Column>
              <Column style={{ width: '30%', textAlign: 'right' }}>
                <Text style={tableHeaderText}>Amount</Text>
              </Column>
            </Row>
            {lineItems.map((item, index) => (
              <Row key={index} style={tableRow}>
                <Column style={{ width: '70%' }}>
                  <Text style={tableText}>{item.description}</Text>
                </Column>
                <Column style={{ width: '30%', textAlign: 'right' }}>
                  <Text style={tableText}>{item.amount}</Text>
                </Column>
              </Row>
            ))}
            <Hr style={divider} />
            <Row style={totalRow}>
              <Column style={{ width: '70%' }}>
                <Text style={totalLabel}>Total Amount</Text>
              </Column>
              <Column style={{ width: '30%', textAlign: 'right' }}>
                <Text style={totalAmount}>{totalAmount}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={{ width: '70%' }}>
                <Text style={balanceLabel}>Balance Due</Text>
              </Column>
              <Column style={{ width: '30%', textAlign: 'right' }}>
                <Text style={balanceAmount}>{balanceDue}</Text>
              </Column>
            </Row>
          </Section>

          {/* Call to Action */}
          {paymentUrl && paymentUrl !== '#' && (
            <Section style={buttonContainer}>
              <Button style={button} href={paymentUrl}>
                Pay Invoice
              </Button>
            </Section>
          )}

          {/* Footer */}
          <Hr style={divider} />
          <Text style={footer}>
            If you have any questions about this invoice, please contact us at{' '}
            {companyEmail}
          </Text>
          <Text style={footerSmall}>
            Thank you for your business!
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InvoiceEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#1e3a5f',
}

const heading = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#ffffff',
  margin: '0 0 8px',
}

const subheading = {
  fontSize: '16px',
  color: '#d4af37',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
}

const box = {
  padding: '0 24px',
  marginTop: '24px',
}

const detailsColumn = {
  paddingRight: '12px',
}

const label = {
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
}

const value = {
  fontSize: '16px',
  color: '#1f2937',
  fontWeight: '500',
  margin: '0',
}

const tableHeader = {
  borderBottom: '2px solid #e5e7eb',
  paddingBottom: '8px',
  marginBottom: '8px',
}

const tableHeaderText = {
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  fontWeight: '600',
  margin: '0',
}

const tableRow = {
  borderBottom: '1px solid #f3f4f6',
  paddingTop: '12px',
  paddingBottom: '12px',
}

const tableText = {
  fontSize: '14px',
  color: '#1f2937',
  margin: '0',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
}

const totalRow = {
  marginTop: '8px',
}

const totalLabel = {
  fontSize: '14px',
  color: '#6b7280',
  fontWeight: '500',
  margin: '0',
}

const totalAmount = {
  fontSize: '16px',
  color: '#1f2937',
  fontWeight: '600',
  margin: '0',
}

const balanceLabel = {
  fontSize: '16px',
  color: '#1f2937',
  fontWeight: '600',
  margin: '4px 0 0',
}

const balanceAmount = {
  fontSize: '24px',
  color: '#1e3a5f',
  fontWeight: 'bold',
  margin: '4px 0 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '32px',
}

const button = {
  backgroundColor: '#d4af37',
  borderRadius: '6px',
  color: '#1e3a5f',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  margin: '24px 24px 0',
}

const footerSmall = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '8px 24px 0',
}
