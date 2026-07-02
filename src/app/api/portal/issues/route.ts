import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import type { PortalContext } from '@/lib/portal-auth'

// Escape client-supplied text before embedding it in the notification email
// HTML, so a crafted issue title/description can't inject markup into the
// internal staff email.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Best-effort notification to the account owner when a client reports an issue.
// The portal UI promises the account manager is notified immediately, so this
// makes that real. Every failure path is swallowed — a mail problem must never
// block issue creation.
async function notifyAccountOwner(params: {
  ctx: PortalContext
  locationName: string
  category: string
  severity: string
  title: string
  description: string | null
  issueId: string
}) {
  try {
    if (!process.env.RESEND_API_KEY) return

    const { ctx } = params

    // Resolve a real recipient: the client's most recent account manager, then
    // the branch mailbox, then the company mailbox, then our shared inbox.
    const [client, shiftWithManager] = await Promise.all([
      prisma.client.findUnique({
        where: { id: ctx.client.id },
        select: {
          branch: {
            select: { email: true, company: { select: { email: true } } },
          },
        },
      }),
      prisma.shift.findFirst({
        where: { location: { clientId: ctx.client.id }, managerId: { not: null } },
        orderBy: { date: 'desc' },
        select: { manager: { select: { email: true } } },
      }),
    ])

    const to =
      shiftWithManager?.manager?.email ||
      client?.branch?.email ||
      client?.branch?.company?.email ||
      'hello@urbansimple.net'

    // Prefer a verified sender; the sandbox address only delivers to the Resend
    // account owner, so an internal notification from it would silently fail.
    const from =
      process.env.RESEND_FROM_EMAIL ||
      process.env.RESEND_OUTREACH_FROM_EMAIL ||
      'onboarding@resend.dev'
    const reporter = `${ctx.firstName} ${ctx.lastName}`.trim() || ctx.email
    const subject = `New issue reported: ${params.title} (${ctx.client.name})`

    const rows = [
      ['Client', ctx.client.name],
      ['Location', params.locationName],
      ['Reported by', reporter],
      ['Category', params.category],
      ['Severity', params.severity],
    ]
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#8a8a8a;font-size:13px;">${escapeHtml(k)}</td><td style="padding:4px 0;font-size:13px;font-weight:600;">${escapeHtml(v)}</td></tr>`
      )
      .join('')

    const descriptionBlock = params.description
      ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(params.description)}</p>`
      : ''

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:520px;">
        <h2 style="font-size:18px;margin:0 0 4px;">${escapeHtml(params.title)}</h2>
        <p style="margin:0 0 16px;color:#8a8a8a;font-size:13px;">A client reported a new issue in the Urban Simple portal.</p>
        <table style="border-collapse:collapse;">${rows}</table>
        ${descriptionBlock}
      </div>
    `

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from, to, subject, html })
  } catch (err) {
    console.error('[portal/issues] issue notification failed:', err)
  }
}

// GET /api/portal/issues — list issues for the authenticated client.
export async function GET() {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const issues = await prisma.issue.findMany({
    where: { clientId: ctx.client.id },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      title: true,
      category: true,
      severity: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      location: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(issues)
}

// POST /api/portal/issues — create a new issue from the portal.
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { locationId, category, severity, title, description } = body

  if (!locationId || !title || !title.trim()) {
    return NextResponse.json({ error: 'Location and title are required' }, { status: 400 })
  }

  // Confirm the location belongs to this user's client.
  const validLocation = ctx.locations.find(l => l.id === locationId)
  if (!validLocation) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
  }

  const cleanCategory = category || 'other'
  const cleanSeverity = severity || 'medium'
  const cleanTitle = title.trim()
  const cleanDescription = description?.trim() || null

  const created = await prisma.issue.create({
    data: {
      locationId,
      clientId: ctx.client.id,
      reportedById: ctx.userId,
      category: cleanCategory,
      severity: cleanSeverity,
      title: cleanTitle,
      description: cleanDescription,
      status: 'open',
    },
    select: { id: true },
  })

  // Best-effort: notify the account owner. Never let this break issue creation.
  await notifyAccountOwner({
    ctx,
    locationName: validLocation.name,
    category: cleanCategory,
    severity: cleanSeverity,
    title: cleanTitle,
    description: cleanDescription,
    issueId: created.id,
  })

  return NextResponse.json(created, { status: 201 })
}
