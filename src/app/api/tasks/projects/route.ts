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

    const projects = await prisma.project.findMany({
      where,
      include: includeTaskCount ? {
        _count: {
          select: {
            tasks: true,
          },
        },
        tasks: {
          where: {
            status: { in: ['todo', 'in_progress'] },
          },
          select: {
            id: true,
          },
        },
      } : undefined,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Transform to include task counts properly
    const projectsWithCounts = projects.map(project => ({
      ...project,
      taskCount: includeTaskCount ? (project as typeof project & { _count: { tasks: number } })._count?.tasks || 0 : undefined,
      openTaskCount: includeTaskCount ? (project as typeof project & { tasks: { id: string }[] }).tasks?.length || 0 : undefined,
      tasks: undefined, // Remove the tasks array from response
      _count: undefined, // Remove _count from response
    }))

    return NextResponse.json(projectsWithCounts)
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
