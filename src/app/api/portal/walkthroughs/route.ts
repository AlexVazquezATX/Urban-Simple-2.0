import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { normalizeZone, summarizeWalkthrough, type WalkthroughZone } from '@/lib/portal-walkthrough'
import { cleanPortalPhotos } from '@/lib/portal-photos'
import { onIssueCreated } from '@/lib/ops/issue-events'

// "Kitchen Line, Restrooms and 2 more need attention", kept under 200 chars.
function walkthroughIssueTitle(zones: string[]): string {
  const shown = zones.slice(0, 3)
  const extra = zones.length - shown.length
  const list =
    extra > 0
      ? `${shown.join(', ')} and ${extra} more`
      : shown.length > 1
        ? `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
        : shown[0]
  const verb = zones.length === 1 ? 'needs' : 'need'
  return `Walkthrough: ${list} ${verb} attention`.slice(0, 200)
}

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
  // A super admin previewing the portal must not create real records,
  // alerts or invite emails in the client's name.
  if (ctx.impersonating) {
    return NextResponse.json({ error: 'Disabled while viewing as a client' }, { status: 403 })
  }

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

  const overallNotes = typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 4000) : null
  const created = await prisma.portalWalkthrough.create({
    data: {
      clientId: ctx.client.id,
      locationId,
      completedById: ctx.userId,
      zones: normalizedZones as unknown as object,
      notes: overallNotes,
      photoCount: summary.photoCount,
      overallRating: summary.overallRating,
    },
    select: { id: true },
  })

  // Zones marked "needs attention" become one issue for the account manager.
  // Self-serve accounts have no Urban Simple crew, so their walkthroughs stay
  // a private inspection trail.
  const flagged = normalizedZones.filter(z => z.rating === 'issue')
  let issueId: string | null = null
  if (flagged.length > 0 && !ctx.client.isSelfServe) {
    const lines = flagged.map(z => `${z.zone}: ${z.notes?.trim() || 'Marked as needing attention'}`)
    if (overallNotes) lines.push('', `Overall notes: ${overallNotes}`)
    const issue = await prisma.issue.create({
      data: {
        locationId,
        clientId: ctx.client.id,
        reportedById: ctx.userId,
        type: 'issue',
        source: 'client',
        visibleToClient: true,
        category: 'quality',
        severity: 'medium',
        title: walkthroughIssueTitle(flagged.map(z => z.zone)),
        description: lines.join('\n').slice(0, 4000),
        photos: cleanPortalPhotos(flagged.flatMap(z => z.photos), ctx.client.id, 12),
        status: 'open',
      },
      select: { id: true },
    })
    issueId = issue.id
    after(() => onIssueCreated(issue.id))
  }

  return NextResponse.json({ ...created, issueId, flaggedZones: flagged.length }, { status: 201 })
}
