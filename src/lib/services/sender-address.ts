// Which address an email goes out from. Cold outreach has its own domain so
// spam complaints can't reach the one clients and billing rely on, so only
// mail to cold prospects may ever use RESEND_OUTREACH_FROM_EMAIL.

import { isInboundSource } from './outreach-recipient'

const MAIN_FROM = 'alex@urbansimple.net'

/**
 * Invoices, reminders, notifications, and anything else a client may read.
 * Not RESEND_FROM_EMAIL: in production that is BackHaus's address, for the
 * studio's own mail.
 */
export function mainFromAddress(): string {
  return MAIN_FROM
}

export function outreachFromAddress(): string {
  return process.env.RESEND_OUTREACH_FROM_EMAIL || mainFromAddress()
}

/** Someone who asked to hear from us gets the main address, not the cold domain. */
export function prospectFromAddress(source: string | null | undefined): string {
  return isInboundSource(source) ? mainFromAddress() : outreachFromAddress()
}

/** A hub reply stays on the cold domain only for a prospect we emailed cold. */
export function hubReplyFromAddress(thread: {
  clientId?: string | null
  prospect?: { source?: string | null; convertedToClientId?: string | null } | null
}): string {
  const cold = !!thread.prospect && !thread.clientId && !thread.prospect.convertedToClientId && !isInboundSource(thread.prospect.source)
  return cold ? outreachFromAddress() : mainFromAddress()
}
