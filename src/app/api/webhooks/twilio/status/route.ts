import { NextRequest, NextResponse } from 'next/server'
import { stampCommBySmsStatus } from '@/lib/comms/log'
import { smsFailureReason, smsLifecycle, smsStatusCallbackUrl, verifyTwilioSignature } from '@/lib/notify/sms'

// POST /api/webhooks/twilio/status — delivery receipts for texts we send.
// sendSms sets this as each message's StatusCallback, so no Twilio console
// setup is needed. Delivered and failed texts update their Comms Hub row;
// in-flight statuses (queued, sent) are ignored.
export async function POST(request: NextRequest) {
  const form = await request.formData()
  const params: Record<string, string> = {}
  for (const [k, v] of form.entries()) if (typeof v === 'string') params[k] = v

  // Twilio signs the exact callback URL we handed it.
  if (!verifyTwilioSignature(smsStatusCallbackUrl(), params, request.headers.get('x-twilio-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  const sid = params.MessageSid
  const outcome = smsLifecycle(params.MessageStatus)
  if (sid && outcome) {
    const matched = await stampCommBySmsStatus(sid, outcome, smsFailureReason(params.ErrorCode))
    if (outcome === 'failed') {
      console.warn('[webhooks/twilio/status] text not delivered:', sid, params.ErrorCode ?? '', matched ? '' : '(no hub row)')
    }
  }

  // Twilio only needs a 2xx.
  return new NextResponse(null, { status: 204 })
}
