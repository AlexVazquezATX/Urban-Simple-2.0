import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface AutoResponderProps {
  firstName: string
  businessName: string
}

const PHONE = '(800) 513-4157'

export const AutoResponder = ({
  firstName = 'there',
  businessName = 'your business',
}: AutoResponderProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Thanks — I got your walkthrough request. A phone call from Alex follows during business hours.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={greeting}>Hey {firstName},</Text>
            <Text style={paragraph}>
              Thanks for reaching out. I got your request for {businessName} and I will follow up with a phone call during business hours so we can find a time for your walkthrough.
            </Text>
            <Text style={paragraph}>
              A quick note on who you are dealing with. Urban Simple is operator-run. My co-founder Demian and I both ran venues before we started the company. If something is broken in your cleaning program, we want to see it in person, not over email. That is why the walkthrough is free and there is no pitch.
            </Text>
            <Text style={paragraph}>Talk soon,</Text>
            <Text style={signature}>
              Alex Vazquez
              <br />
              Co-Founder, Urban Simple LLC
              <br />
              {PHONE}
              <br />
              urbansimple.net
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default AutoResponder

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

const section: React.CSSProperties = {
  margin: 0,
}

const greeting: React.CSSProperties = {
  fontSize: '16px',
  color: '#1f1d1b',
  margin: '0 0 16px',
}

const paragraph: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#3d3a36',
  margin: '0 0 16px',
}

const signature: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#1f1d1b',
  margin: '16px 0 0',
}
