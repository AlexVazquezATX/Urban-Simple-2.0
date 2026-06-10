import {
  Body,
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

interface PaymentReminderEmailProps {
  invoiceNumber: string
  clientName: string
  dueDate: string
  balanceDue: string
  daysPastDue: number
  companyName?: string
  companyEmail?: string
}

export const PaymentReminderEmail = ({
  invoiceNumber = 'INV-202601-0001',
  clientName = 'Acme Corporation',
  dueDate = 'February 14, 2026',
  balanceDue = '$2,500.00',
  daysPastDue = 0,
  companyName = 'Urban Simple',
  companyEmail = 'billing@urbansimple.net',
}: PaymentReminderEmailProps) => {
  const overdue = daysPastDue > 0
  return (
    <Html>
      <Head />
      <Preview>
        Payment reminder for invoice {invoiceNumber}: {balanceDue}{' '}
        {overdue ? 'past due' : `due ${dueDate}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={heading}>{companyName}</Heading>
            <Text style={subheading}>Payment Reminder</Text>
          </Section>

          <Section style={box}>
            <Text style={paragraph}>Hi {clientName},</Text>
            <Text style={paragraph}>
              {overdue
                ? `This is a friendly reminder that invoice ${invoiceNumber} was due on ${dueDate} and has an outstanding balance of ${balanceDue}.`
                : `This is a friendly reminder that invoice ${invoiceNumber} has a balance of ${balanceDue} due on ${dueDate}.`}
            </Text>

            <Section style={amountBox}>
              <Row>
                <Column>
                  <Text style={label}>Invoice</Text>
                  <Text style={value}>{invoiceNumber}</Text>
                </Column>
                <Column>
                  <Text style={label}>Due Date</Text>
                  <Text style={value}>{dueDate}</Text>
                </Column>
                <Column>
                  <Text style={label}>Balance Due</Text>
                  <Text style={balanceValue}>{balanceDue}</Text>
                </Column>
              </Row>
            </Section>

            <Text style={paragraph}>
              If payment is already on the way, please disregard this note. If
              you have any questions about this invoice or need a copy, just
              reply to this email and we will get it sorted.
            </Text>
            <Text style={paragraph}>
              Thank you,
              <br />
              Alex
              <br />
              {companyName}
            </Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            {companyName} | {companyEmail}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PaymentReminderEmail

const main = {
  backgroundColor: '#f6f5f2',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '24px 0',
  maxWidth: '560px',
}

const header = {
  padding: '24px 32px 8px',
}

const heading = {
  fontSize: '22px',
  fontWeight: 600 as const,
  color: '#2b2926',
  margin: '0',
}

const subheading = {
  fontSize: '14px',
  color: '#8a857d',
  margin: '4px 0 0',
}

const box = {
  backgroundColor: '#ffffff',
  borderRadius: '4px',
  border: '1px solid #e7e4de',
  padding: '24px 32px',
}

const amountBox = {
  backgroundColor: '#f6f5f2',
  borderRadius: '4px',
  padding: '16px 20px',
  margin: '16px 0',
}

const paragraph = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#2b2926',
}

const label = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  color: '#8a857d',
  margin: '0 0 2px',
}

const value = {
  fontSize: '14px',
  fontWeight: 500 as const,
  color: '#2b2926',
  margin: '0',
}

const balanceValue = {
  fontSize: '14px',
  fontWeight: 600 as const,
  color: '#b42318',
  margin: '0',
}

const hr = {
  borderColor: '#e7e4de',
  margin: '20px 0',
}

const footer = {
  fontSize: '12px',
  color: '#8a857d',
  textAlign: 'center' as const,
}
