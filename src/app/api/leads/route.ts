import { NextRequest, NextResponse } from 'next/server'
import { leadFormSchema, type LeadPayload } from '@/lib/leads/schema'
import { postLeadToCrm } from '@/lib/leads/crm'
import { sendLeadEmails } from '@/lib/leads/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = leadFormSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid submission' },
      { status: 400 },
    )
  }

  const data = parsed.data

  if (data.website && data.website.trim().length > 0) {
    return NextResponse.json({ ok: true })
  }

  const payload: LeadPayload = {
    source: 'urbansimple.net/walkthrough',
    submitted_at: new Date().toISOString(),
    first_name: data.first_name,
    last_name: data.last_name,
    business_name: data.business_name,
    business_type: data.business_type,
    location: data.location,
    square_footage_bucket: data.square_footage_bucket,
    current_cleaning: data.current_cleaning,
    start_timing: data.start_timing,
    email: data.email,
    phone: data.phone,
    notes: data.notes && data.notes.trim().length > 0 ? data.notes : undefined,
    utm_source: data.utm_source || undefined,
    utm_medium: data.utm_medium || undefined,
    utm_campaign: data.utm_campaign || undefined,
    referrer: data.referrer || undefined,
  }

  await Promise.allSettled([postLeadToCrm(payload), sendLeadEmails(payload)])

  return NextResponse.json({ ok: true })
}
