import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const createTopicSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
  category: z.enum(['tech', 'business', 'local', 'industry', 'personal', 'general']).default('general'),
  priority: z.number().int().min(0).max(100).default(0),
})

/**
 * GET /api/admin/pulse/topics
 * List all topics for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const topics = await prisma.pulseTopic.findMany({
      where: {
        userId: user.id,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        _count: {
          select: {
            briefingItems: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      topics,
    })
  } catch (error: any) {
    console.error('Error fetching topics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topics', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/pulse/topics
 * Create a new topic
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createTopicSchema.parse(body)

    // Check for duplicate topic name
    const existing = await prisma.pulseTopic.findFirst({
      where: {
        userId: user.id,
        name: {
          equals: validatedData.name,
          mode: 'insensitive',
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A topic with this name already exists' },
        { status: 400 }
      )
    }

    const topic = await prisma.pulseTopic.create({
      data: {
        userId: user.id,
        name: validatedData.name,
        description: validatedData.description,
        keywords: validatedData.keywords,
        category: validatedData.category,
        priority: validatedData.priority,
      },
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
    }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating topic:', error)
    return NextResponse.json(
      { error: 'Failed to create topic', details: error.message },
      { status: 500 }
    )
  }
}
