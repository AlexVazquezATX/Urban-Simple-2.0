import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { cleanPortalPhotos } from '@/lib/portal-photos'
import { ISSUE_CATEGORIES, SEVERITIES } from '@/lib/ops/constants'
import { onIssueCreated } from '@/lib/ops/issue-events'

// GET /api/portal/issues — list client-visible issues for the authenticated
// client. ?type=request returns service requests instead.
export async function GET(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wantRequests = request.nextUrl.searchParams.get('type') === 'request'
  const issues = await prisma.issue.findMany({
    where: {
      clientId: ctx.client.id,
      visibleToClient: true,
      type: wantRequests ? 'request' : { in: ['issue', 'incomplete_work'] },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      type: true,
      title: true,
      category: true,
      severity: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      preferredDate: true,
      location: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(issues)
}

// POST /api/portal/issues — create a new issue from the portal.
// Body: { locationId, category, severity, title, description?, photos?: string[] }
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Self-serve (studio-only) accounts have no cleaning service to report on.
  if (ctx.client.isSelfServe) {
    return NextResponse.json({ error: 'Issue reporting is for Urban Simple cleaning clients' }, { status: 403 })
  }
  if (ctx.impersonating) {
    return NextResponse.json({ error: 'Disabled while viewing as a client' }, { status: 403 })
  }

  const limit = checkRateLimit(`portal-issue:${ctx.userId}`, { limit: 20, windowSeconds: 60 * 60 })
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many reports in a short time. Please try again in a bit.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const locationId = typeof body.locationId === 'string' ? body.locationId : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const category = typeof body.category === 'string' && body.category ? body.category : 'other'
  const severity = typeof body.severity === 'string' && body.severity ? body.severity : 'medium'

  if (!locationId || !title) {
    return NextResponse.json({ error: 'Location and title are required' }, { status: 400 })
  }
  if (title.length > 200) {
    return NextResponse.json({ error: 'Please keep the title under 200 characters' }, { status: 400 })
  }
  if (description.length > 4000) {
    return NextResponse.json({ error: 'Please keep the details under 4000 characters' }, { status: 400 })
  }
  if (!ISSUE_CATEGORIES.some(c => c.id === category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (!(SEVERITIES as readonly string[]).includes(severity)) {
    return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
  }

  // Confirm the location belongs to this user's client.
  if (!ctx.locations.some(l => l.id === locationId)) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
  }

  const created = await prisma.issue.create({
    data: {
      locationId,
      clientId: ctx.client.id,
      reportedById: ctx.userId,
      type: 'issue',
      source: 'client',
      visibleToClient: true,
      category,
      severity,
      title,
      description: description || null,
      photos: cleanPortalPhotos(body.photos, ctx.client.id, 4),
      status: 'open',
    },
    select: { id: true },
  })

  after(() => onIssueCreated(created.id))

  return NextResponse.json(created, { status: 201 })
}
