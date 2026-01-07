import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const updateTopicSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  keywords: z.array(z.string()).min(1).optional(),
  category: z.enum(['tech', 'business', 'local', 'industry', 'personal', 'general']).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/pulse/topics/[id]
 * Get a single topic by ID
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

    const topic = await prisma.pulseTopic.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            briefingItems: true,
          },
        },
      },
    })

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      topic,
    })
  } catch (error: any) {
    console.error('Error fetching topic:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topic', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/pulse/topics/[id]
 * Update a topic
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

    // Verify topic belongs to user
    const existing = await prisma.pulseTopic.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateTopicSchema.parse(body)

    // Check for duplicate name if updating name
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.pulseTopic.findFirst({
        where: {
          userId: user.id,
          name: {
            equals: validatedData.name,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A topic with this name already exists' },
          { status: 400 }
        )
      }
    }

    const topic = await prisma.pulseTopic.update({
      where: { id },
      data: validatedData,
      include: {
        _count: {
          select: {
            briefingItems: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      topic,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error updating topic:', error)
    return NextResponse.json(
      { error: 'Failed to update topic', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/pulse/topics/[id]
 * Delete a topic
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Verify topic belongs to user
    const existing = await prisma.pulseTopic.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      )
    }

    await prisma.pulseTopic.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Topic deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting topic:', error)
    return NextResponse.json(
      { error: 'Failed to delete topic', details: error.message },
      { status: 500 }
    )
  }
}
