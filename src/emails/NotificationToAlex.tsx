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
} from '@react-email/components'
import * as React from 'react'

interface NotificationToAlexProps {
  name: string
  businessName: string
  businessTypeLabel: string
  location: string
  squareFootageLabel: string
  currentCleaningLabel: string
  startTimingLabel: string
  phone: string
  email: string
  notes?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
  submittedAtFormatted: string
}

export const NotificationToAlex = ({
  name = '',
  businessName = '',
  businessTypeLabel = '',
  location = '',
  squareFootageLabel = '',
  currentCleaningLabel = '',
  startTimingLabel = '',
  phone = '',
  email = '',
  notes,
  utmSource,
  utmMedium,
  utmCampaign,
  referrer,
  submittedAtFormatted = '',
}: NotificationToAlexProps) => {
  const utmLine = `${utmSource || '-'}/${utmMedium || '-'}/${utmCampaign || '-'}`
  const displayName = name && name.trim().length > 0 ? name : 'Not provided'

  return (
    <Html>
      <Head />
      <Preview>
        New walkthrough request: {businessName} ({businessTypeLabel})
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New walkthrough request</Heading>

          <Section style={section}>
            <Text style={lead}>
              <strong>{displayName}</strong>
            </Text>
            <Text style={line}>
              {businessName} — {businessTypeLabel}
            </Text>
            <Text style={line}>
              {location} | {squareFootageLabel}
            </Text>
            <Text style={line}>
              Current cleaning: {currentCleaningLabel}
            </Text>
            <Text style={line}>
              Wants to start: {startTimingLabel}
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={groupHeading}>Contact</Text>
            <Text style={line}>
              Phone: <Link href={`tel:${phone}`} style={link}>{phone}</Link>
            </Text>
            <Text style={line}>
              Email: <Link href={`mailto:${email}`} style={link}>{email}</Link>
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={groupHeading}>Notes</Text>
            <Text style={line}>{notes && notes.trim().length > 0 ? notes : 'None'}</Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={groupHeading}>Source</Text>
            <Text style={line}>UTM: {utmLine}</Text>
            <Text style={line}>Referrer: {referrer || '-'}</Text>
            <Text style={line}>Submitted: {submittedAtFormatted}</Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={line}>
              CRM:{' '}
              <Link href="https://www.urbansimple.net/growth/prospects" style={link}>
                https://www.urbansimple.net/growth/prospects
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default NotificationToAlex

const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '32px 28px',
  maxWidth: '600px',
}

const heading: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#1f1d1b',
  margin: '0 0 16px',
}

const section: React.CSSProperties = {
  margin: '0 0 8px',
}

const groupHeading: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#787268',
  margin: '0 0 6px',
}

const lead: React.CSSProperties = {
  fontSize: '16px',
  color: '#1f1d1b',
  margin: '0 0 4px',
}

const line: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#3d3a36',
  margin: '0 0 4px',
}

const divider: React.CSSProperties = {
  borderColor: '#ebe8e4',
  margin: '16px 0',
}

const link: React.CSSProperties = {
  color: '#8B6544',
  textDecoration: 'none',
}
