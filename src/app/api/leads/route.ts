import { NextRequest, NextResponse } from 'next/server'
import { leadFormSchema, type LeadPayload } from '@/lib/leads/schema'
import { LeadConflictError, persistLead } from '@/lib/leads/intake'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/leads - persist a walkthrough lead and delivery jobs atomically.
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = leadFormSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid submission' }, { status: 400 })
  }
  const data = parsed.data
  if (data.website?.trim()) return NextResponse.json({ ok: true })
  const payload: LeadPayload = {
    source: 'urbansimple.net/walkthrough',
    submitted_at: new Date().toISOString(),
    name: data.name,
    business_name: data.business_name,
    business_type: data.business_type || undefined,
    location: data.location,
    square_footage_bucket: data.square_footage_bucket || undefined,
    current_cleaning: data.current_cleaning || undefined,
    start_timing: data.start_timing || undefined,
    email: data.email.toLowerCase(),
    phone: data.phone || undefined,
    notes: data.notes || undefined,
    utm_source: data.utm_source || undefined,
    utm_medium: data.utm_medium || undefined,
    utm_campaign: data.utm_campaign || undefined,
    referrer: data.referrer || undefined,
  }
  try {
    const receipt = await persistLead(payload, data.submission_id)
    return NextResponse.json({ ok: true, duplicate: receipt.duplicate, notifications: 'queued' })
  } catch (error) {
    if (error instanceof LeadConflictError) {
      return NextResponse.json({ ok: false, error: 'Submission ID already used for a different request' }, { status: 409 })
    }
    console.error('[leads] durable intake failed')
    return NextResponse.json(
      { ok: false, error: 'We could not save your request. Please try again.' },
      { status: 503, headers: { 'Retry-After': '30' } },
    )
  }
}
