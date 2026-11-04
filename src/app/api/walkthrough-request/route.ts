import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { LeadConflictError, persistLead } from '@/lib/leads/intake'
import type { BusinessType, LeadPayload } from '@/lib/leads/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(1).max(40),
  company: z.string().trim().max(160).optional(),
  propertyType: z.string().trim().max(80).optional(),
  message: z.string().trim().max(2000).optional(),
  website: z.string().max(200).optional(),
})

const BUSINESS_TYPE: Record<string, BusinessType> = {
  Restaurant: 'restaurant',
  'Hotel & Resort': 'hotel',
  'Event Venue': 'event_space',
}

// POST /api/walkthrough-request - the home page forms. They ask for less than
// the walkthrough landing page, but a lead from either gets the same treatment,
// so both go through the same durable intake.
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Name, email, and phone are required' }, { status: 400 })
  }
  const data = parsed.data
  // Honeypot: tell the bot it worked and save nothing.
  if (data.website?.trim()) return NextResponse.json({ success: true })

  const notes = [
    data.propertyType ? `Property type: ${data.propertyType}` : null,
    data.message || null,
  ].filter(Boolean).join('\n\n')
  const payload: LeadPayload = {
    source: 'urbansimple.net/home',
    submitted_at: new Date().toISOString(),
    name: data.name,
    business_name: data.company || 'Not provided',
    business_type: data.propertyType ? BUSINESS_TYPE[data.propertyType] ?? 'other' : undefined,
    location: 'Not provided',
    email: data.email.toLowerCase(),
    phone: data.phone,
    notes: notes || undefined,
  }
  try {
    await persistLead(payload)
    return NextResponse.json({ success: true, message: 'Walkthrough request submitted successfully' })
  } catch (error) {
    if (error instanceof LeadConflictError) {
      return NextResponse.json({ error: 'Please try again.' }, { status: 409 })
    }
    console.error('[walkthrough-request] durable intake failed')
    return NextResponse.json(
      { error: 'We could not save your request. Please try again.' },
      { status: 503, headers: { 'Retry-After': '30' } },
    )
  }
}
