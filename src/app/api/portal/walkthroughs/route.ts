import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { normalizeZone, summarizeWalkthrough, type WalkthroughZone } from '@/lib/portal-walkthrough'

// GET /api/portal/walkthroughs — list recent walkthroughs for the user's client.
export async function GET() {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.portalWalkthrough.findMany({
    where: { clientId: ctx.client.id },
    orderBy: [{ capturedAt: 'desc' }],
    take: 60,
    include: {
      location: { select: { id: true, name: true } },
      completedBy: { select: { firstName: true, lastName: true } },
    },
  })

  return NextResponse.json(items)
}

// POST /api/portal/walkthroughs — record a new walkthrough.
// Body: { locationId, zones: WalkthroughZone[], notes? }
// Photos must already be uploaded (use /api/portal/walkthrough-photo endpoint
// to upload, then pass the URLs here).
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { locationId, zones, notes } = body

  if (!locationId || typeof locationId !== 'string') {
    return NextResponse.json({ error: 'locationId required' }, { status: 400 })
  }
  if (!ctx.locations.find(l => l.id === locationId)) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
  }

  const normalizedZones: WalkthroughZone[] = Array.isArray(zones)
    ? zones.map(normalizeZone).filter((z): z is WalkthroughZone => z !== null)
    : []

  if (normalizedZones.length === 0) {
    return NextResponse.json(
      { error: 'At least one zone with photos or notes is required' },
      { status: 400 }
    )
  }

  const summary = summarizeWalkthrough(normalizedZones)

  const created = await prisma.portalWalkthrough.create({
    data: {
      clientId: ctx.client.id,
      locationId,
      completedById: ctx.userId,
      zones: normalizedZones as unknown as object,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      photoCount: summary.photoCount,
      overallRating: summary.overallRating,
    },
    select: { id: true },
  })

  return NextResponse.json(created, { status: 201 })
}
