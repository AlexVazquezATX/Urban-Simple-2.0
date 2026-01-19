import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/tasks - List tasks with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const projectId = searchParams.get('projectId')
    const priority = searchParams.get('priority')
    const isFocusTask = searchParams.get('isFocusTask')
    const focusDate = searchParams.get('focusDate')
    const dueBefore = searchParams.get('dueBefore')
    const dueAfter = searchParams.get('dueAfter')
    const includeProject = searchParams.get('includeProject') === 'true'
    const includeTags = searchParams.get('includeTags') === 'true'
    const includeLinks = searchParams.get('includeLinks') === 'true'
    const includeStats = searchParams.get('includeStats') !== 'false' // Default true for backwards compat
    const limit = searchParams.get('limit')
    const orderBy = searchParams.get('orderBy') || 'createdAt'
    const order = searchParams.get('order') || 'desc'

    // Build where clause
    const where: Record<string, unknown> = {
      userId: user.id,
      companyId: user.companyId,
    }

    if (status) {
      // Support comma-separated statuses
      const statuses = status.split(',')
      where.status = statuses.length > 1 ? { in: statuses } : status
    }

    if (projectId) {
      where.projectId = projectId === 'null' ? null : projectId
    }

    if (priority) {
      const priorities = priority.split(',')
      where.priority = priorities.length > 1 ? { in: priorities } : priority
    }

    if (isFocusTask === 'true') {
      where.isFocusTask = true
    }

    if (focusDate) {
      const date = new Date(focusDate)
      date.setHours(0, 0, 0, 0)
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      where.focusDate = {
        gte: date,
        lt: nextDay,
      }
    }

    if (dueBefore) {
      where.dueDate = {
        ...(where.dueDate as object || {}),
        lte: new Date(dueBefore),
      }
    }

    if (dueAfter) {
      where.dueDate = {
        ...(where.dueDate as object || {}),
        gte: new Date(dueAfter),
      }
    }

    // Build include clause
    const include: Record<string, unknown> = {}

    if (includeProject) {
      include.project = {
        select: {
          id: true,
          name: true,
          color: true,
        },
      }
    }

    if (includeTags) {
      include.tags = {
        include: {
          tag: true,
        },
      }
    }

    if (includeLinks) {
      include.links = true
    }

    // Build orderBy clause
    const orderByClause: Record<string, string> = {}
    orderByClause[orderBy] = order

    // Run queries in parallel for better performance
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const baseWhere = {
      userId: user.id,
      companyId: user.companyId,
    }

    // Only fetch stats if requested (skip for simple task updates)
    if (includeStats) {
      const [tasks, statsResult] = await Promise.all([
        prisma.task.findMany({
          where,
          include: Object.keys(include).length > 0 ? include : undefined,
          orderBy: orderByClause,
          take: limit ? parseInt(limit) : undefined,
        }),
        // Single raw query for all stats instead of 3 separate queries
        prisma.$queryRaw<Array<{ status: string; count: bigint; overdue: bigint; due_today: bigint }>>`
          SELECT
            status,
            COUNT(*) as count,
            SUM(CASE WHEN status IN ('todo', 'in_progress') AND due_date < ${today} THEN 1 ELSE 0 END) as overdue,
            SUM(CASE WHEN status IN ('todo', 'in_progress') AND due_date >= ${today} AND due_date < ${tomorrow} THEN 1 ELSE 0 END) as due_today
          FROM tasks
          WHERE user_id = ${user.id} AND company_id = ${user.companyId}
          GROUP BY status
        `
      ])

      // Process stats from raw query
      const byStatus: Record<string, number> = {}
      let overdueCount = 0
      let dueTodayCount = 0

      for (const row of statsResult) {
        byStatus[row.status] = Number(row.count)
        overdueCount += Number(row.overdue)
        dueTodayCount += Number(row.due_today)
      }

      return NextResponse.json({
        tasks,
        stats: {
          byStatus,
          overdue: overdueCount,
          dueToday: dueTodayCount,
          total: tasks.length,
        },
      })
    } else {
      // Simple task fetch without stats
      const tasks = await prisma.task.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy: orderByClause,
        take: limit ? parseInt(limit) : undefined,
      })

      return NextResponse.json({ tasks })
    }
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create a new task
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
      status = 'todo',
      priority = 'medium',
      projectId,
      dueDate,
      scheduledDate,
      tagIds = [],
      links = [],
    } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        title: title.trim(),
        description: description?.trim() || null,
        status,
        priority,
        projectId: projectId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        // Create tag assignments
        tags: tagIds.length > 0 ? {
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        } : undefined,
        // Create links to other entities
        links: links.length > 0 ? {
          create: links.map((link: { entityType: string; entityId: string; entityLabel?: string }) => ({
            entityType: link.entityType,
            entityId: link.entityId,
            entityLabel: link.entityLabel,
          })),
        } : undefined,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        links: true,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
