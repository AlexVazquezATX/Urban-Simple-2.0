import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/admin/pulse/briefings
 * List all briefings for the current user with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '30', 10)
    const skip = (page - 1) * limit

    // Get total count
    const total = await prisma.pulseBriefing.count({
      where: { userId: user.id },
    })

    // Get briefings with item counts
    const briefings = await prisma.pulseBriefing.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    })

    return NextResponse.json({
      success: true,
      briefings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching briefings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch briefings', details: error.message },
      { status: 500 }
    )
  }
}
