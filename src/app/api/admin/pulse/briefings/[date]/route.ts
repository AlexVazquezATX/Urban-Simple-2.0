import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ date: string }>
}

/**
 * GET /api/admin/pulse/briefings/[date]
 * Get a briefing by date (YYYY-MM-DD format)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    const { date: dateStr } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      )
    }

    // Parse and validate date
    const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!dateMatch) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const date = new Date(dateStr)
    date.setUTCHours(0, 0, 0, 0)

    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date' },
        { status: 400 }
      )
    }

    const briefing = await prisma.pulseBriefing.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date,
        },
      },
      include: {
        items: {
          include: {
            topic: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!briefing) {
      return NextResponse.json({
        success: true,
        briefing: null,
        message: `No briefing for ${dateStr}`,
      })
    }

    return NextResponse.json({
      success: true,
      briefing,
    })
  } catch (error: any) {
    console.error('Error fetching briefing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch briefing', details: error.message },
      { status: 500 }
    )
  }
}
