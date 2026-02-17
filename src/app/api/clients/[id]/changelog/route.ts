import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/clients/[id]/changelog?cursor=xxx&limit=50
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    // Verify client belongs to user's company
    const client = await prisma.client.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get all facility profile IDs for this client (to filter related entities)
    const facilities = await prisma.facilityProfile.findMany({
      where: { clientId: id },
      select: {
        id: true,
        seasonalRules: { select: { id: true } },
        monthlyOverrides: { select: { id: true } },
      },
    })

    const facilityIds = facilities.map(f => f.id)
    const seasonalRuleIds = facilities.flatMap(f => f.seasonalRules.map(r => r.id))
    const overrideIds = facilities.flatMap(f => f.monthlyOverrides.map(o => o.id))

    // All entity IDs related to this client
    const entityIds = [id, ...facilityIds, ...seasonalRuleIds, ...overrideIds]

    const logs = await prisma.auditLog.findMany({
      where: { entityId: { in: entityIds } },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // fetch one extra to check if there's a next page
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    })

    const hasMore = logs.length > limit
    const items = hasMore ? logs.slice(0, limit) : logs
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({
      items,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error('Error fetching changelog:', error)
    return NextResponse.json(
      { error: 'Failed to fetch changelog' },
      { status: 500 }
    )
  }
}
