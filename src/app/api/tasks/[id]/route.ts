import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/tasks/[id] - Get a single task
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

    const task = await prisma.task.findUnique({
      where: { id },
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

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify ownership
    if (task.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

// PATCH /api/tasks/[id] - Update a task
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
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (existingTask.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const {
      title,
      description,
      status,
      priority,
      projectId,
      dueDate,
      scheduledDate,
      kanbanOrder,
      isFocusTask,
      focusDate,
      focusReason,
      focusPriority,
      tagIds,
      links,
    } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (status !== undefined) {
      updateData.status = status
      // Set completedAt when marking as done
      if (status === 'done') {
        updateData.completedAt = new Date()
      } else if (status === 'todo' || status === 'in_progress') {
        updateData.completedAt = null
      }
    }
    if (priority !== undefined) updateData.priority = priority
    if (projectId !== undefined) updateData.projectId = projectId || null
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null
    if (kanbanOrder !== undefined) updateData.kanbanOrder = kanbanOrder
    if (isFocusTask !== undefined) updateData.isFocusTask = isFocusTask
    if (focusDate !== undefined) updateData.focusDate = focusDate ? new Date(focusDate) : null
    if (focusReason !== undefined) updateData.focusReason = focusReason
    if (focusPriority !== undefined) updateData.focusPriority = focusPriority

    // Handle tags update
    if (tagIds !== undefined) {
      // Delete existing tag assignments and create new ones
      await prisma.taskTagAssignment.deleteMany({
        where: { taskId: id },
      })

      if (tagIds.length > 0) {
        await prisma.taskTagAssignment.createMany({
          data: tagIds.map((tagId: string) => ({
            taskId: id,
            tagId,
          })),
        })
      }
    }

    // Handle links update
    if (links !== undefined) {
      // Delete existing links and create new ones
      await prisma.taskLink.deleteMany({
        where: { taskId: id },
      })

      if (links.length > 0) {
        await prisma.taskLink.createMany({
          data: links.map((link: { entityType: string; entityId: string; entityLabel?: string }) => ({
            taskId: id,
            entityType: link.entityType,
            entityId: link.entityId,
            entityLabel: link.entityLabel,
          })),
        })
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id] - Delete a task
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
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (existingTask.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.task.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
