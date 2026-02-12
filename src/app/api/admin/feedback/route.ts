import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 25

    const where: Record<string, unknown> = {}
    if (category) {
      where.category = category
    }

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          company: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ])

    // Compute summary stats
    const stats = await prisma.feedback.aggregate({
      _avg: { rating: true },
      _count: { id: true },
    })

    return NextResponse.json({
      feedback,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        averageRating: Math.round((stats._avg.rating || 0) * 10) / 10,
        totalCount: stats._count.id,
      },
    })
  } catch (error) {
    console.error('[Admin Feedback API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load feedback' },
      { status: 500 }
    )
  }
}
