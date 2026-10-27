// Builds the outgoing outreach email shared by every send path: HTML plus a
// plain-text part, the sender's signature, and the CAN-SPAM footer (postal
// address + opt-out) with List-Unsubscribe headers so Gmail and Outlook show
// their native unsubscribe button instead of users reaching for "Report spam".

import crypto from 'crypto'

type Signature = { emailSignature?: string | null; signatureLogoUrl?: string | null } | null | undefined

function unsubscribeSecret(): string | null {
  return process.env.OUTREACH_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || null
}

function sign(prospectId: string, contactId: string): string | null {
  const secret = unsubscribeSecret()
  if (!secret) return null
  return crypto
    .createHmac('sha256', secret)
    .update(`unsubscribe:${prospectId}:${contactId}`)
    .digest('base64url')
}

/** Constant-time check of an unsubscribe link's token. */
export function verifyUnsubscribeToken(prospectId: string, contactId: string, token: string): boolean {
  const expected = sign(prospectId, contactId)
  if (!expected || !token) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * One-click unsubscribe URL. Carries ids, never the email address, so the
 * address doesn't end up in link-scanner or server logs. contactId may be ''
 * when the recipient isn't a saved contact.
 */
export function unsubscribeUrl(prospectId: string, contactId: string | null | undefined): string | null {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
  const c = contactId ?? ''
  const token = sign(prospectId, c)
  if (!base.startsWith('https://') || !token) return null
  const qs = new URLSearchParams({ p: prospectId, c, t: token })
  return `${base}/api/outreach/unsubscribe?${qs.toString()}`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

let warnedNoAddress = false

export function buildOutreachEmail(opts: {
  /** Plain text with \n line breaks, or HTML when bodyIsHtml is set. */
  body: string
  bodyIsHtml?: boolean
  signature?: Signature
  prospectId: string
  contactId?: string | null
}): { html: string; text: string; headers: Record<string, string> } {
  const { body, bodyIsHtml, signature, prospectId, contactId } = opts

  let html = bodyIsHtml ? body : body.replace(/\n/g, '<br>')
  let text = bodyIsHtml ? htmlToText(body) : body

  if (signature?.emailSignature || signature?.signatureLogoUrl) {
    html += '<br><br>--<br>'
    text += '\n\n--'
    if (signature.emailSignature) {
      html += signature.emailSignature.replace(/\n/g, '<br>')
      text += `\n${htmlToText(signature.emailSignature)}`
    }
    if (signature.signatureLogoUrl) {
      html += `<br><br><img src="${signature.signatureLogoUrl}" alt="Logo" style="max-height: 60px; width: auto;" />`
    }
  }

  // CAN-SPAM: a valid postal address and a working opt-out on every commercial email.
  const address = process.env.OUTREACH_POSTAL_ADDRESS?.trim() || null
  if (!address && !warnedNoAddress) {
    warnedNoAddress = true
    console.warn('[OUTREACH] OUTREACH_POSTAL_ADDRESS is not set; outreach emails go out without a postal address (CAN-SPAM requires one)')
  }
  const url = unsubscribeUrl(prospectId, contactId)
  const optOutText = url
    ? `If you'd rather not hear from us, reply "unsubscribe" or opt out here: ${url}`
    : `If you'd rather not hear from us, just reply "unsubscribe".`
  const optOutHtml = url
    ? `If you'd rather not hear from us, reply "unsubscribe" or <a href="${escapeHtml(url)}" style="color:#888;">opt out here</a>.`
    : `If you'd rather not hear from us, just reply "unsubscribe".`

  html += `<p style="margin-top:24px;font-size:12px;line-height:1.5;color:#888;">${address ? `${escapeHtml(address)}<br>` : ''}${optOutHtml}</p>`
  text += `\n\n${address ? `${address}\n` : ''}${optOutText}`

  const headers: Record<string, string> = {}
  const mailto = process.env.OUTREACH_REPLY_TO || process.env.RESEND_OUTREACH_FROM_EMAIL || null
  const targets = [
    mailto ? `<mailto:${mailto.replace(/^.*<([^>]+)>.*$/, '$1')}?subject=unsubscribe>` : null,
    url ? `<${url}>` : null,
  ].filter(Boolean)
  if (targets.length) headers['List-Unsubscribe'] = targets.join(', ')
  // RFC 8058 one-click: the mail client POSTs to the https URL itself.
  if (url) headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'

  return { html, text, headers }
}
