// Transactional email for ops alerts (staff + client). One branded layout,
// one sender, every send logged to the Communications Hub. Never throws:
// a mail failure must not break the action that triggered it.

import { Resend } from 'resend'
import { logComm, type CommCategory } from '@/lib/comms/log'

let resendClient: Resend | null = null
function getResend(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Absolute base URL for links in emails/SMS. */
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ).replace(/\/$/, '')
}

export function fromAddress(): string {
  return (
    process.env.RESEND_PORTAL_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.RESEND_OUTREACH_FROM_EMAIL ||
    'onboarding@resend.dev'
  )
}

export interface AlertEmailContent {
  kicker: string // small caps line above the title, e.g. "Unfinished work"
  title: string
  intro?: string
  rows?: Array<[string, string]> // label/value table
  /** Bulleted list (e.g. unfinished items). Plain text, escaped here. */
  bullets?: string[]
  body?: string // free text, rendered pre-wrapped
  ctaLabel?: string
  ctaUrl?: string
  footer?: string
}

/** Branded HTML matching the portal weekly digest palette. */
export function renderAlertEmail(c: AlertEmailContent): string {
  const rows = (c.rows ?? [])
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 14px 4px 0;color:#7d7163;font-size:13px;vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1f1c19;">${escapeHtml(v)}</td></tr>`
    )
    .join('')
  const bullets = (c.bullets ?? [])
    .map(b => `<li style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#1f1c19;">${escapeHtml(b)}</li>`)
    .join('')
  const cta =
    c.ctaUrl && c.ctaLabel
      ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(c.ctaUrl)}" style="display:inline-block;background:#3a7d44;color:#ffffff;text-decoration:none;font-weight:500;padding:12px 22px;border-radius:4px;font-size:14px;">${escapeHtml(c.ctaLabel)}</a></p>`
      : ''

  return `<!doctype html><html><body style="margin:0;padding:0;background:#faf6ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f1c19;">
<div style="max-width:560px;margin:0 auto;padding:28px 20px;">
  <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a08c75;">Urban Simple · ${escapeHtml(c.kicker)}</p>
  <h1 style="margin:6px 0 0;font-size:20px;line-height:1.3;font-weight:600;color:#1f1c19;">${escapeHtml(c.title)}</h1>
  <div style="margin-top:18px;background:#ffffff;border:1px solid #ece4d3;border-radius:6px;padding:20px;">
    ${c.intro ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;">${escapeHtml(c.intro)}</p>` : ''}
    ${rows ? `<table style="border-collapse:collapse;">${rows}</table>` : ''}
    ${bullets ? `<ul style="margin:14px 0 0;padding-left:20px;">${bullets}</ul>` : ''}
    ${c.body ? `<p style="margin:14px 0 0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(c.body)}</p>` : ''}
    ${cta}
  </div>
  <p style="margin:16px 0 0;font-size:11px;color:#a08c75;">${escapeHtml(c.footer ?? 'Urban Simple · Commercial cleaning, Austin TX')}</p>
</div></body></html>`
}

export function renderAlertText(c: AlertEmailContent): string {
  return [
    c.title,
    c.intro,
    ...(c.rows ?? []).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    ...(c.bullets ?? []).map(b => `- ${b}`),
    c.body,
    c.ctaUrl ? `${c.ctaLabel ?? 'Open'}: ${c.ctaUrl}` : undefined,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export interface SendEmailInput {
  companyId: string
  to: string
  subject: string
  content: AlertEmailContent
  category?: CommCategory
  clientId?: string | null
  userId?: string | null
  replyTo?: string
}

/** Send one email. Returns true when Resend accepted it. */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const resend = getResend()
  const to = input.to?.trim()
  if (!resend || !to || !to.includes('@')) return false
  const from = fromAddress()
  const html = renderAlertEmail(input.content)
  const text = renderAlertText(input.content)
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: input.subject,
      html,
      text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    })
    if (error) {
      console.error('[notify/email] send failed:', to, error)
      return false
    }
    void logComm({
      companyId: input.companyId,
      direction: 'outbound',
      category: input.category ?? 'transactional',
      fromEmail: from.replace(/^.*<([^>]+)>.*$/, '$1'),
      toEmail: to,
      subject: input.subject,
      body: text,
      clientId: input.clientId ?? null,
      userId: input.userId ?? null,
      resendEmailId: data?.id ?? null,
    })
    return true
  } catch (err) {
    console.error('[notify/email] send threw:', to, err)
    return false
  }
}
