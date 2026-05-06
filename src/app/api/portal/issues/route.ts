import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'

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

  const created = await prisma.issue.create({
    data: {
      locationId,
      clientId: ctx.client.id,
      reportedById: ctx.userId,
      category: category || 'other',
      severity: severity || 'medium',
      title: title.trim(),
      description: description?.trim() || null,
      status: 'open',
    },
    select: { id: true },
  })

  return NextResponse.json(created, { status: 201 })
}
