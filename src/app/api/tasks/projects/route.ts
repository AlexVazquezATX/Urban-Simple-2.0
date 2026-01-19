import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/tasks/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const includeTaskCount = searchParams.get('includeTaskCount') === 'true'

    const where: Record<string, unknown> = {
      userId: user.id,
      companyId: user.companyId,
    }

    if (status) {
      const statuses = status.split(',')
      where.status = statuses.length > 1 ? { in: statuses } : status
    }

    if (includeTaskCount) {
      // Run both queries in parallel for better performance
      const [projects, openCounts] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            _count: {
              select: {
                tasks: true,
              },
            },
          },
          orderBy: [
            { sortOrder: 'asc' },
            { createdAt: 'desc' },
          ],
        }),
        // Get open task counts with a single aggregated query instead of fetching all tasks
        prisma.task.groupBy({
          by: ['projectId'],
          where: {
            userId: user.id,
            companyId: user.companyId,
            status: { in: ['todo', 'in_progress'] },
            projectId: { not: null },
          },
          _count: true,
        })
      ])

      // Create a map for quick lookup
      const openCountMap = new Map(
        openCounts.map(c => [c.projectId, c._count])
      )

      // Transform to include task counts properly
      const projectsWithCounts = projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        status: project.status,
        dueDate: project.dueDate,
        sortOrder: project.sortOrder,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        taskCount: project._count?.tasks || 0,
        openTaskCount: openCountMap.get(project.id) || 0,
      }))

      return NextResponse.json(projectsWithCounts)
    } else {
      // Simple fetch without counts
      const projects = await prisma.project.findMany({
        where,
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
      })

      return NextResponse.json(projects)
    }
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/tasks/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      color = '#3B82F6',
      dueDate,
    } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Get max sort order
    const maxSortOrder = await prisma.project.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
      },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        name: name.trim(),
        description: description?.trim() || null,
        color,
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder: (maxSortOrder?.sortOrder || 0) + 1,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
