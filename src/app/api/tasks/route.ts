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
    const isStarred = searchParams.get('isStarred')
    const focusDate = searchParams.get('focusDate')
    const dueBefore = searchParams.get('dueBefore')
    const dueAfter = searchParams.get('dueAfter')
    const includeProject = searchParams.get('includeProject') === 'true'
    const includeGoal = searchParams.get('includeGoal') !== 'false' // Default true
    const includeTags = searchParams.get('includeTags') === 'true'
    const includeLinks = searchParams.get('includeLinks') === 'true'
    const includeStats = searchParams.get('includeStats') !== 'false' // Default true for backwards compat
    const starredFirst = searchParams.get('starredFirst') !== 'false' // Default true - starred tasks at top
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

    if (isStarred === 'true') {
      where.isStarred = true
    } else if (isStarred === 'false') {
      where.isStarred = false
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

    if (includeGoal) {
      include.goal = {
        select: {
          id: true,
          title: true,
          color: true,
          period: true,
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

    // Build orderBy clause - starred tasks first by default
    const orderByClause: Array<Record<string, string>> = []
    if (starredFirst) {
      orderByClause.push({ isStarred: 'desc' }) // true (1) comes before false (0) in desc
    }
    orderByClause.push({ [orderBy]: order })

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
      // Fetch tasks first
      const tasks = await prisma.task.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy: orderByClause,
        take: limit ? parseInt(limit) : undefined,
      })

      // Fetch stats using Prisma queries instead of raw SQL for better compatibility
      const [todoCount, inProgressCount, doneCount, overdueTasks, dueTodayTasks] = await Promise.all([
        prisma.task.count({ where: { ...baseWhere, status: 'todo' } }),
        prisma.task.count({ where: { ...baseWhere, status: 'in_progress' } }),
        prisma.task.count({ where: { ...baseWhere, status: 'done' } }),
        prisma.task.count({
          where: {
            ...baseWhere,
            status: { in: ['todo', 'in_progress'] },
            dueDate: { lt: today },
          },
        }),
        prisma.task.count({
          where: {
            ...baseWhere,
            status: { in: ['todo', 'in_progress'] },
            dueDate: { gte: today, lt: tomorrow },
          },
        }),
      ])

      return NextResponse.json({
        tasks,
        stats: {
          byStatus: {
            todo: todoCount,
            in_progress: inProgressCount,
            done: doneCount,
          },
          overdue: overdueTasks,
          dueToday: dueTodayTasks,
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
      goalId,
      dueDate,
      scheduledDate,
      isStarred = false,
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
        goalId: goalId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        isStarred,
        starredAt: isStarred ? new Date() : null,
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
        goal: {
          select: {
            id: true,
            title: true,
            color: true,
            period: true,
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
