import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const updateItemSchema = z.object({
  isBookmarked: z.boolean().optional(),
  isRead: z.boolean().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/admin/pulse/items/[id]
 * Update a briefing item (bookmark, mark as read)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      )
    }

    // Verify item belongs to user's briefing
    const existing = await prisma.pulseBriefingItem.findFirst({
      where: {
        id,
        briefing: {
          userId: user.id,
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateItemSchema.parse(body)

    // Build update data
    const updateData: {
      isBookmarked?: boolean
      isRead?: boolean
      readAt?: Date | null
    } = {}

    if (validatedData.isBookmarked !== undefined) {
      updateData.isBookmarked = validatedData.isBookmarked
    }

    if (validatedData.isRead !== undefined) {
      updateData.isRead = validatedData.isRead
      updateData.readAt = validatedData.isRead ? new Date() : null
    }

    const item = await prisma.pulseBriefingItem.update({
      where: { id },
      data: updateData,
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      item,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error updating item:', error)
    return NextResponse.json(
      { error: 'Failed to update item', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/pulse/items/[id]
 * Get a single briefing item with full content
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      )
    }

    const item = await prisma.pulseBriefingItem.findFirst({
      where: {
        id,
        briefing: {
          userId: user.id,
        },
      },
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        briefing: {
          select: {
            id: true,
            date: true,
            title: true,
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Mark as read
    if (!item.isRead) {
      await prisma.pulseBriefingItem.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      item,
    })
  } catch (error: any) {
    console.error('Error fetching item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch item', details: error.message },
      { status: 500 }
    )
  }
}
