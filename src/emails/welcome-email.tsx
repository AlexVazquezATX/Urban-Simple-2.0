import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

const BASE_URL = 'https://backhaus.ai'

interface WelcomeEmailProps {
  firstName: string
  restaurantName: string
  loginUrl?: string
}

export const WelcomeEmail = ({
  firstName = 'there',
  restaurantName = 'your restaurant',
  loginUrl = 'https://backhaus.ai/studio/login',
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Welcome to BackHaus — your AI-powered creative studio is ready
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src={`${BASE_URL}/images/backhaus-logos/backhaus-logo-yellow.png`}
              alt="BackHaus"
              width="220"
              height="auto"
              style={logo}
            />
            <Text style={subheading}>AI Creative Studio</Text>
          </Section>

          {/* Body */}
          <Section style={body}>
            <Heading as="h2" style={bodyHeading}>
              Welcome, {firstName}!
            </Heading>
            <Text style={paragraph}>
              Your BackHaus account for <strong>{restaurantName}</strong> is ready to go.
              You have <strong>10 free AI-generated images</strong> to get started.
            </Text>

            <Text style={paragraph}>
              Here&apos;s what you can do:
            </Text>

            <Text style={listItem}>
              <strong>Generate</strong> — Create stunning food photography and branded content with AI
            </Text>
            <Text style={listItem}>
              <strong>Gallery</strong> — Browse and download all your generated images
            </Text>
            <Text style={listItem}>
              <strong>Brand Kit</strong> — Save your restaurant&apos;s style for consistent results
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={loginUrl}>
                Open Your Studio
              </Button>
            </Section>

            <Text style={paragraph}>
              If you have any questions, just reply to this email — we&apos;re here to help.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footerSection}>
            <Img
              src={`${BASE_URL}/images/backhaus-logos/backhaus-icon-yellow.png`}
              alt="BH"
              width="28"
              height="28"
              style={footerIcon}
            />
            <Text style={footer}>
              BackHaus by Urban Simple
            </Text>
            <Text style={footerSmall}>
              AI-powered food photography & branded content for hospitality
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail

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
  padding: '36px 24px 28px',
  textAlign: 'center' as const,
  backgroundColor: '#292524',
}

const logo = {
  margin: '0 auto',
}

const subheading = {
  fontSize: '13px',
  color: '#d4af37',
  margin: '12px 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '3px',
}

const body = {
  padding: '32px 24px',
}

const bodyHeading = {
  fontSize: '22px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 16px',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#4b5563',
  margin: '0 0 16px',
}

const listItem = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#4b5563',
  margin: '0 0 8px',
  paddingLeft: '8px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#d4af37',
  borderRadius: '6px',
  color: '#292524',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '0 24px',
}

const footerSection = {
  textAlign: 'center' as const,
  padding: '16px 24px 0',
}

const footerIcon = {
  margin: '0 auto 8px',
}

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0',
}

const footerSmall = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '4px 0 0',
}
