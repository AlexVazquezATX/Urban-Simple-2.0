import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Helper to get the start of the current week (Monday)
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Helper to get the end of the current week (Sunday)
function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

// Helper to get the start of the current month
function getMonthStart(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

// Helper to get the end of the current month
function getMonthEnd(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0) // Last day of previous month = last day of current month
  d.setHours(23, 59, 59, 999)
  return d
}

// GET /api/goals/current - Get current week's and month's goals
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const date = dateParam ? new Date(dateParam) : new Date()

    const weekStart = getWeekStart(date)
    const weekEnd = getWeekEnd(date)
    const monthStart = getMonthStart(date)
    const monthEnd = getMonthEnd(date)

    // Fetch weekly and monthly goals in parallel
    const [weeklyGoals, monthlyGoals] = await Promise.all([
      prisma.goal.findMany({
        where: {
          userId: user.id,
          companyId: user.companyId,
          period: 'weekly',
          periodStart: {
            gte: weekStart,
            lte: weekEnd,
          },
          status: { in: ['active', 'completed'] },
        },
        include: {
          _count: {
            select: { tasks: true },
          },
          parent: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.goal.findMany({
        where: {
          userId: user.id,
          companyId: user.companyId,
          period: 'monthly',
          periodStart: {
            gte: monthStart,
            lte: monthEnd,
          },
          status: { in: ['active', 'completed'] },
        },
        include: {
          _count: {
            select: { tasks: true },
          },
          children: {
            where: {
              status: 'active',
              periodStart: {
                gte: weekStart,
                lte: weekEnd,
              },
            },
            select: {
              id: true,
              title: true,
              status: true,
              progress: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    // Calculate progress for each goal
    const calculateProgress = async (goals: typeof weeklyGoals) => {
      return Promise.all(
        goals.map(async (goal) => {
          const [totalTasks, completedTasks] = await Promise.all([
            prisma.task.count({ where: { goalId: goal.id } }),
            prisma.task.count({ where: { goalId: goal.id, status: 'done' } }),
          ])

          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : goal.progress

          return {
            ...goal,
            taskCount: totalTasks,
            completedTaskCount: completedTasks,
            progress,
          }
        })
      )
    }

    const [weeklyWithProgress, monthlyWithProgress] = await Promise.all([
      calculateProgress(weeklyGoals),
      calculateProgress(monthlyGoals),
    ])

    return NextResponse.json({
      weekly: weeklyWithProgress,
      monthly: monthlyWithProgress,
      weekRange: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
      monthRange: {
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching current goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch current goals' },
      { status: 500 }
    )
  }
}
