import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/goals/[id] - Get a single goal with tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const goal = await prisma.goal.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
          orderBy: [
            { status: 'asc' }, // todo and in_progress before done
            { createdAt: 'desc' },
          ],
        },
        children: {
          where: { status: 'active' },
          orderBy: { sortOrder: 'asc' },
        },
        parent: {
          select: {
            id: true,
            title: true,
            period: true,
          },
        },
      },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Verify ownership
    if (goal.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate progress from tasks
    const totalTasks = goal.tasks.length
    const completedTasks = goal.tasks.filter(t => t.status === 'done').length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : goal.progress

    return NextResponse.json({
      ...goal,
      taskCount: totalTasks,
      completedTaskCount: completedTasks,
      progress,
    })
  } catch (error) {
    console.error('Error fetching goal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goal' },
      { status: 500 }
    )
  }
}

// PATCH /api/goals/[id] - Update a goal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify ownership first
    const existingGoal = await prisma.goal.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    if (existingGoal.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const {
      title,
      description,
      status,
      progress,
      color,
      sortOrder,
      parentId,
    } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (status !== undefined) {
      updateData.status = status
      // Set completedAt when marking as completed
      if (status === 'completed') {
        updateData.completedAt = new Date()
      } else if (status === 'active') {
        updateData.completedAt = null
      }
    }
    if (progress !== undefined) updateData.progress = progress
    if (color !== undefined) updateData.color = color
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (parentId !== undefined) updateData.parentId = parentId || null

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            period: true,
          },
        },
      },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    )
  }
}

// DELETE /api/goals/[id] - Delete a goal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership first
    const existingGoal = await prisma.goal.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    if (existingGoal.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Unlink tasks from this goal before deleting
    await prisma.task.updateMany({
      where: { goalId: id },
      data: { goalId: null },
    })

    await prisma.goal.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    )
  }
}
