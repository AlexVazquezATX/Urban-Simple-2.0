import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { appBaseUrl } from '@/lib/notify/email'
import { START_WORDS, STOP_WORDS, toE164, verifyTwilioSignature } from '@/lib/notify/sms'

// POST /api/webhooks/twilio — inbound SMS (configure as the Messaging
// Service / number "A message comes in" webhook in Twilio).
//
// Twilio itself blocks delivery after STOP; this keeps our records in sync so
// the UI shows who opted out and we stop trying. START re-subscribes.
function twiml(message?: string) {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
  return new NextResponse(body, { headers: { 'Content-Type': 'text/xml' } })
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const params: Record<string, string> = {}
  for (const [k, v] of form.entries()) if (typeof v === 'string') params[k] = v

  const url = `${appBaseUrl()}${request.nextUrl.pathname}`
  if (!verifyTwilioSignature(url, params, request.headers.get('x-twilio-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  const from = toE164(params.From)
  const word = (params.Body ?? '').trim().toLowerCase()
  if (!from) return twiml()

  const isStop = STOP_WORDS.includes(word)
  const isStart = START_WORDS.includes(word)
  if (!isStop && !isStart) {
    // Replies aren't monitored here; Twilio handles HELP automatically.
    return twiml()
  }

  try {
    // Stored phones are free-form, so match on the normalized number.
    const contacts = await prisma.clientContact.findMany({
      where: { phone: { not: null }, OR: [{ alertSms: true }, { smsOptedOutAt: { not: null } }] },
      select: { id: true, phone: true },
    })
    const contactIds = contacts.filter(c => toE164(c.phone) === from).map(c => c.id)
    if (contactIds.length) {
      await prisma.clientContact.updateMany({
        where: { id: { in: contactIds } },
        data: isStop ? { smsOptedOutAt: new Date(), alertSms: false } : { smsOptedOutAt: null },
      })
    }

    if (isStop) {
      const users = await prisma.user.findMany({
        where: { phone: { not: null }, smsAlerts: true },
        select: { id: true, phone: true },
      })
      const userIds = users.filter(u => toE164(u.phone) === from).map(u => u.id)
      if (userIds.length) {
        await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { smsAlerts: false } })
      }
    }
  } catch (err) {
    console.error('[webhooks/twilio] opt-out sync failed:', err)
  }

  return twiml()
}
