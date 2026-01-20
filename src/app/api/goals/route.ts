import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/goals - List goals with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') // weekly, monthly
    const status = searchParams.get('status') // active, completed, etc.
    const periodStart = searchParams.get('periodStart') // ISO date
    const periodEnd = searchParams.get('periodEnd') // ISO date
    const includeTaskCount = searchParams.get('includeTaskCount') === 'true'
    const includeChildren = searchParams.get('includeChildren') === 'true'

    // Build where clause
    const where: Record<string, unknown> = {
      userId: user.id,
      companyId: user.companyId,
    }

    if (period) {
      where.period = period
    }

    if (status) {
      const statuses = status.split(',')
      where.status = statuses.length > 1 ? { in: statuses } : status
    }

    if (periodStart) {
      where.periodStart = { gte: new Date(periodStart) }
    }

    if (periodEnd) {
      where.periodEnd = { lte: new Date(periodEnd) }
    }

    // Build include for relations
    const include: Record<string, unknown> = {}

    if (includeTaskCount) {
      include._count = {
        select: {
          tasks: true,
        },
      }
    }

    if (includeChildren) {
      include.children = {
        where: { status: 'active' },
        orderBy: { sortOrder: 'asc' },
      }
    }

    const goals = await prisma.goal.findMany({
      where,
      include: Object.keys(include).length > 0 ? include : undefined,
      orderBy: [
        { period: 'asc' }, // weekly before monthly
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Calculate progress for each goal based on linked tasks
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const taskStats = await prisma.task.aggregate({
          where: {
            goalId: goal.id,
          },
          _count: true,
        })

        const completedTasks = await prisma.task.count({
          where: {
            goalId: goal.id,
            status: 'done',
          },
        })

        const totalTasks = taskStats._count
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : goal.progress

        return {
          ...goal,
          taskCount: totalTasks,
          completedTaskCount: completedTasks,
          progress,
        }
      })
    )

    return NextResponse.json(goalsWithProgress)
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    )
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      period,
      periodStart,
      periodEnd,
      parentId,
      color = '#3B82F6',
    } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!period || !['weekly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { error: 'Period must be "weekly" or "monthly"' },
        { status: 400 }
      )
    }

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Period start and end dates are required' },
        { status: 400 }
      )
    }

    // Enforce max 5 weekly goals per week
    if (period === 'weekly') {
      const existingCount = await prisma.goal.count({
        where: {
          userId: user.id,
          companyId: user.companyId,
          period: 'weekly',
          periodStart: new Date(periodStart),
          status: { in: ['active', 'completed'] },
        },
      })

      if (existingCount >= 5) {
        return NextResponse.json(
          { error: 'Maximum 5 weekly goals allowed per week' },
          { status: 400 }
        )
      }
    }

    // Get max sort order for this period
    const maxSortOrder = await prisma.goal.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
        period,
        periodStart: new Date(periodStart),
      },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        title: title.trim(),
        description: description?.trim() || null,
        period,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        parentId: parentId || null,
        color,
        sortOrder: (maxSortOrder?.sortOrder || 0) + 1,
      },
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    )
  }
}
