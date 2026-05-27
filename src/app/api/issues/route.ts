// Admin-side issue endpoints. Mirrors the portal POST (which lets a client
// report an issue from their portal) but adds: admin-only create / list, with
// admin extras like assignedToId, status, and full filtering. Scoped to the
// user's company via the location→client→companyId chain.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const CATEGORIES = new Set(['quality', 'equipment', 'communication', 'safety', 'other'])
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical'])
const STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed'])

// GET /api/issues — list issues across the company with optional filters.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const severity = searchParams.get('severity')
  const locationId = searchParams.get('locationId')
  const clientId = searchParams.get('clientId')
  const assignedToId = searchParams.get('assignedToId')

  const issues = await prisma.issue.findMany({
    where: {
      client: { companyId: user.companyId },
      ...(status && { status }),
      ...(severity && { severity }),
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
  })

  return NextResponse.json(issues)
}

// POST /api/issues — admin creates an issue on a location.
// Required: locationId, title.
// Optional: clientId (derived from location if absent), category, severity,
// description, status, assignedToId, photos[].
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const {
    locationId,
    title,
    description,
    category,
    severity,
    status,
    assignedToId,
    photos,
  } = body

  if (!locationId || typeof locationId !== 'string') {
    return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  // Verify the location is in this user's company; pull clientId from it.
  const location = await prisma.location.findFirst({
    where: { id: locationId, client: { companyId: user.companyId } },
    select: { id: true, clientId: true },
  })
  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const resolvedCategory = typeof category === 'string' && CATEGORIES.has(category)
    ? category
    : 'other'
  const resolvedSeverity = typeof severity === 'string' && SEVERITIES.has(severity)
    ? severity
    : 'medium'
  const resolvedStatus = typeof status === 'string' && STATUSES.has(status)
    ? status
    : 'open'

  const issue = await prisma.issue.create({
    data: {
      locationId: location.id,
      clientId: location.clientId,
      reportedById: user.id,
      title: title.trim(),
      description: typeof description === 'string' ? description : null,
      category: resolvedCategory,
      severity: resolvedSeverity,
      status: resolvedStatus,
      assignedToId: typeof assignedToId === 'string' ? assignedToId : null,
      photos: Array.isArray(photos) ? photos.filter((p) => typeof p === 'string') : [],
    },
    include: {
      location: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(issue, { status: 201 })
}
