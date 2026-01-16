/**
 * Quick Post Ideas API
 * POST - Generate instant post ideas for a topic
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTopicById, updateTopic } from '@/lib/services/inspiration-service'
import { generateQuickPostIdeas } from '@/lib/ai/inspiration-generator'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Generate quick post ideas
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Parse optional platform filter
    const body = await request.json().catch(() => ({}))
    const platform = body.platform

    // Check if we already have post ideas cached
    const existingIdeas = topic.postIdeas as object[]
    if (existingIdeas && existingIdeas.length > 0 && !body.regenerate) {
      return NextResponse.json({
        ideas: existingIdeas,
        cached: true,
      })
    }

    // Generate new post ideas
    const ideas = await generateQuickPostIdeas(
      {
        title: topic.title,
        summary: topic.summary,
        context: topic.context || undefined,
        category: topic.category,
      },
      platform
    )

    if (ideas.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate ideas' },
        { status: 500 }
      )
    }

    // Save ideas to the topic for caching
    await updateTopic(id, { postIdeas: ideas })

    return NextResponse.json({
      ideas,
      cached: false,
    })
  } catch (error) {
    console.error('Failed to generate quick post ideas:', error)
    return NextResponse.json(
      { error: 'Failed to generate ideas' },
      { status: 500 }
    )
  }
}
