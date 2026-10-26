import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { cleanPortalPhotos } from '@/lib/portal-photos'
import { REQUEST_KINDS } from '@/lib/ops/constants'
import { onIssueCreated } from '@/lib/ops/issue-events'

// Service requests are Issues with type 'request' (category = request kind),
// so they share the issue thread, status updates and notifications.

// GET /api/portal/requests — the client's service requests.
export async function GET() {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requests = await prisma.issue.findMany({
    where: { clientId: ctx.client.id, visibleToClient: true, type: 'request' },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      preferredDate: true,
      createdAt: true,
      resolvedAt: true,
      location: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(requests)
}

// POST /api/portal/requests
// Body: { locationId, kind, title, details?, preferredDate?: 'yyyy-MM-dd', photos?: string[] }
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // A super admin previewing the portal must not create real records,
  // alerts or invite emails in the client's name.
  if (ctx.impersonating) {
    return NextResponse.json({ error: 'Disabled while viewing as a client' }, { status: 403 })
  }

  if (ctx.client.isSelfServe) {
    return NextResponse.json({ error: 'Service requests are for Urban Simple cleaning clients.' }, { status: 400 })
  }

  const limit = checkRateLimit(`portal-request:${ctx.userId}`, { limit: 20, windowSeconds: 60 * 60 })
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests in a short time. Please try again in a bit.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const locationId = typeof body.locationId === 'string' ? body.locationId : ''
  const kind = typeof body.kind === 'string' ? body.kind : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const details = typeof body.details === 'string' ? body.details.trim() : ''
  const preferredRaw = typeof body.preferredDate === 'string' ? body.preferredDate.trim() : ''

  if (!locationId || !title) {
    return NextResponse.json({ error: 'Location and a short summary are required' }, { status: 400 })
  }
  if (!ctx.locations.some(l => l.id === locationId)) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
  }
  if (!REQUEST_KINDS.some(k => k.id === kind)) {
    return NextResponse.json({ error: 'Pick what kind of request this is' }, { status: 400 })
  }
  if (title.length > 200) {
    return NextResponse.json({ error: 'Please keep the summary under 200 characters' }, { status: 400 })
  }
  if (details.length > 4000) {
    return NextResponse.json({ error: 'Please keep the details under 4000 characters' }, { status: 400 })
  }

  let preferredDate: Date | null = null
  if (preferredRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredRaw)) {
      return NextResponse.json({ error: 'Invalid preferred date' }, { status: 400 })
    }
    preferredDate = new Date(`${preferredRaw}T12:00:00Z`)
    const yesterday = Date.now() - 24 * 60 * 60 * 1000
    if (Number.isNaN(preferredDate.getTime()) || preferredDate.getTime() < yesterday) {
      return NextResponse.json({ error: 'Pick a preferred date that is today or later' }, { status: 400 })
    }
  }

  const created = await prisma.issue.create({
    data: {
      locationId,
      clientId: ctx.client.id,
      reportedById: ctx.userId,
      type: 'request',
      source: 'client',
      visibleToClient: true,
      category: kind,
      severity: 'medium',
      title,
      description: details || null,
      photos: cleanPortalPhotos(body.photos, ctx.client.id, 4),
      preferredDate,
      status: 'open',
    },
    select: { id: true },
  })

  after(() => onIssueCreated(created.id))

  return NextResponse.json(created, { status: 201 })
}
