import { Resend } from 'resend'
import { WelcomeEmail } from '@/emails/welcome-email'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'BackHaus <onboarding@resend.dev>'

interface SendWelcomeEmailParams {
  to: string
  firstName: string
  restaurantName: string
}

export async function sendWelcomeEmail({ to, firstName, restaurantName }: SendWelcomeEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Studio Email] RESEND_API_KEY not configured, skipping welcome email')
    return { success: false, error: 'API key not configured' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Welcome to BackHaus — your studio is ready',
    react: WelcomeEmail({ firstName, restaurantName }),
  })

  if (error) {
    console.error('[Studio Email] Welcome email error:', error)
    return { success: false, error: error.message }
  }

  return { success: true, emailId: data?.id }
}
