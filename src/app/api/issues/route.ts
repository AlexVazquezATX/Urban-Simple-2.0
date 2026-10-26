// Staff-side issue endpoints. Clients report issues and requests through the
// portal (its own route); this is the staff list + "New issue" create. Scoped
// to the user's company via the location→client→companyId chain.

import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ISSUE_CATEGORIES, ISSUE_STATUSES, SEVERITIES } from '@/lib/ops/constants'
import { onIssueCreated } from '@/lib/ops/issue-events'

const CATEGORIES = new Set<string>(ISSUE_CATEGORIES.map(c => c.id))
const SEVERITY_SET = new Set<string>(SEVERITIES)
const STATUS_SET = new Set<string>(ISSUE_STATUSES)
const TYPES = new Set(['issue', 'incomplete_work', 'request'])
const SOURCES = new Set(['associate', 'manager_review', 'client', 'staff'])

// Issue management is a staff surface. Clients must never read the
// company-wide list (it exposes internal notes and unshared findings).
const STAFF_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE'])

// GET /api/issues: list issues across the company with optional filters
// (type, source, status, severity, locationId, clientId, assignedToId).
// Associates only ever see the issues they reported.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!STAFF_ROLES.has(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const severity = searchParams.get('severity')
  const type = searchParams.get('type')
  const source = searchParams.get('source')
  const locationId = searchParams.get('locationId')
  const clientId = searchParams.get('clientId')
  const assignedToId = searchParams.get('assignedToId')
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 500, 1), 1000)

  const issues = await prisma.issue.findMany({
    where: {
      client: { companyId: user.companyId },
      ...(user.role === 'ASSOCIATE' && { reportedById: user.id }),
      ...(status && STATUS_SET.has(status) && { status }),
      ...(severity && SEVERITY_SET.has(severity) && { severity }),
      ...(type && TYPES.has(type) && { type }),
      ...(source && SOURCES.has(source) && { source }),
      ...(locationId && { locationId }),
      ...(clientId && { clientId }),
      ...(assignedToId && { assignedToId }),
    },
    include: {
      location: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, firstName: true, lastName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  })

  return NextResponse.json(issues)
}

// POST /api/issues: staff "New issue" on a location.
// Required: locationId, title.
// Optional: category, severity, description, photos[], serviceLogId,
// visibleToClient (default false: staff findings stay internal until shared).
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!STAFF_ROLES.has(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { locationId, title, description, category, severity, photos, serviceLogId } = body
  const isAssociate = user.role === 'ASSOCIATE'

  if (!locationId || typeof locationId !== 'string') {
    return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (category != null && (typeof category !== 'string' || !CATEGORIES.has(category))) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (severity != null && (typeof severity !== 'string' || !SEVERITY_SET.has(severity))) {
    return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
  }
  // Staff create plain issues here. Requests come from the portal and
  // unfinished work from the associate visit flow.
  if (body.type != null && body.type !== 'issue') {
    return NextResponse.json({ error: 'Only type "issue" can be created here' }, { status: 400 })
  }

  // Verify the location is in this user's company; pull clientId from it.
  const location = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null, client: { companyId: user.companyId } },
    select: { id: true, clientId: true },
  })
  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  let linkedServiceLogId: string | null = null
  if (typeof serviceLogId === 'string' && serviceLogId) {
    const log = await prisma.serviceLog.findFirst({
      where: { id: serviceLogId, locationId: location.id },
      select: { id: true },
    })
    if (!log) {
      return NextResponse.json({ error: 'Service log not found for this location' }, { status: 400 })
    }
    linkedServiceLogId = log.id
  }

  const issue = await prisma.issue.create({
    data: {
      locationId: location.id,
      clientId: location.clientId,
      reportedById: user.id,
      serviceLogId: linkedServiceLogId,
      type: 'issue',
      source: isAssociate ? 'associate' : 'staff',
      title: title.trim().slice(0, 200),
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      category: category ?? 'other',
      severity: severity ?? 'medium',
      status: 'open',
      // Associates never share directly with the client.
      visibleToClient: !isAssociate && body.visibleToClient === true,
      photos: Array.isArray(photos)
        ? photos.filter((p: unknown): p is string => typeof p === 'string').slice(0, 20)
        : [],
    },
    include: {
      location: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })

  after(() => onIssueCreated(issue.id))

  return NextResponse.json(issue, { status: 201 })
}
