import { NextRequest, NextResponse, after } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isOwnStorageUrl, loadAccessibleShift, shiftLocationIds } from '@/lib/ops/field'
import { ISSUE_CATEGORIES, SEVERITIES } from '@/lib/ops/constants'
import { onIssueCreated } from '@/lib/ops/issue-events'

// POST /api/field/flag — an associate reports a problem at a stop that isn't
// a checklist item (broken equipment, no key, pests, leak...). Goes straight
// to the manager; it stays internal until a manager shares it with the client.
//
// Body: { shiftId, locationId, category, severity?, description, photos? }
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json().catch(() => null)) as {
      shiftId?: string
      locationId?: string
      category?: string
      severity?: string
      description?: string
      photos?: string[]
    } | null
    if (!body?.shiftId || !body.locationId) {
      return NextResponse.json({ error: 'shiftId and locationId are required' }, { status: 400 })
    }

    const shift = await loadAccessibleShift(user, body.shiftId)
    if (!shift || !shiftLocationIds(shift).includes(body.locationId)) {
      return NextResponse.json({ error: 'Stop not found on your shift' }, { status: 404 })
    }

    const description = (body.description ?? '').trim().slice(0, 2000)
    if (!description) {
      return NextResponse.json({ error: 'Describe the problem' }, { status: 400 })
    }
    const category = ISSUE_CATEGORIES.some(c => c.id === body.category) ? body.category! : 'other'
    const severity = (SEVERITIES as readonly string[]).includes(body.severity ?? '') ? body.severity! : 'medium'

    const location = await prisma.location.findFirst({
      where: { id: body.locationId, branch: { companyId: user.companyId } },
      select: { id: true, clientId: true },
    })
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const log = await prisma.serviceLog.findFirst({
      where: { shiftId: shift.id, locationId: location.id, associateId: user.id },
      select: { id: true },
    })

    const firstLine = description.split('\n')[0]
    const issue = await prisma.issue.create({
      data: {
        locationId: location.id,
        clientId: location.clientId,
        reportedById: user.id,
        serviceLogId: log?.id ?? null,
        type: 'issue',
        source: user.role === 'ASSOCIATE' ? 'associate' : 'staff',
        category,
        severity,
        title: firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine,
        description,
        photos: (body.photos ?? []).filter(isOwnStorageUrl).slice(0, 4),
        visibleToClient: false,
      },
      select: { id: true },
    })

    after(() => onIssueCreated(issue.id))
    return NextResponse.json({ id: issue.id }, { status: 201 })
  } catch (error) {
    console.error('[field/flag] failed:', error)
    return NextResponse.json({ error: 'Failed to report problem' }, { status: 500 })
  }
}
