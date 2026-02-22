import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'

// GET /api/growth/agent/runs — Paginated activity log
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const stage = searchParams.get('stage')
    const cursor = searchParams.get('cursor')

    const where: any = {
      config: { companyId: user.companyId },
    }

    if (stage) {
      where.stage = stage
    }

    const runs = await prisma.growthAgentRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = runs.length > limit
    if (hasMore) runs.pop()

    return NextResponse.json({
      runs,
      hasMore,
      nextCursor: hasMore ? runs[runs.length - 1]?.id : null,
    })
  } catch (error: any) {
    console.error('Error fetching agent runs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent runs' },
      { status: 500 }
    )
  }
}
