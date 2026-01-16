/**
 * Individual Topic API
 * GET - Get topic details
 * PATCH - Update topic (approve/reject/edit)
 * DELETE - Remove topic
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getTopicById,
  approveTopic,
  rejectTopic,
  updateTopic,
  deleteTopic,
} from '@/lib/services/inspiration-service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Get topic details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const topic = await getTopicById(id)

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    if (user.companyId !== topic.companyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ topic })
  } catch (error) {
    console.error('Failed to get topic:', error)
    return NextResponse.json({ error: 'Failed to get topic' }, { status: 500 })
  }
}

// Update topic (approve, reject, or edit)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const topic = await getTopicById(id)

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    if (user.companyId !== topic.companyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()

    // Handle approve action
    if (body.action === 'approve') {
      const updated = await approveTopic(id, user.id)
      return NextResponse.json({ topic: updated })
    }

    // Handle reject action
    if (body.action === 'reject') {
      const updated = await rejectTopic(id, body.reason)
      return NextResponse.json({ topic: updated })
    }

    // Handle general update
    const allowedFields = [
      'title',
      'summary',
      'context',
      'postIdeas',
      'suggestedHooks',
      'relatedHashtags',
      'imageUrl',
      'status',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updated = await updateTopic(id, updateData)
    return NextResponse.json({ topic: updated })
  } catch (error) {
    console.error('Failed to update topic:', error)
    return NextResponse.json(
      { error: 'Failed to update topic' },
      { status: 500 }
    )
  }
}

// Delete topic
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const topic = await getTopicById(id)

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    if (user.companyId !== topic.companyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await deleteTopic(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete topic:', error)
    return NextResponse.json(
      { error: 'Failed to delete topic' },
      { status: 500 }
    )
  }
}
