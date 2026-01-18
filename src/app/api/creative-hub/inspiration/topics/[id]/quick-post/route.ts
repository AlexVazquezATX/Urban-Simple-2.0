/**
 * Quick Post Ideas API
 * POST - Generate instant post ideas for a topic
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTopicById, updateTopic } from '@/lib/services/inspiration-service'
import { generateQuickPostIdeas } from '@/lib/ai/inspiration-generator'
import type { ContentModeId } from '@/lib/config/brand'

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

    // Parse optional platform filter and content mode
    const body = await request.json().catch(() => ({}))
    const platform = body.platform
    const contentMode: ContentModeId = body.contentMode || 'community'

    // Content customization options
    const contentOptions = {
      tone: body.tone || 'friendly',
      length: body.length || 'medium',
      emoji: body.emoji || 'minimal',
      cta: body.cta || 'soft',
    }

    // Check if we already have post ideas cached
    const existingIdeas = topic.postIdeas as object[]
    if (existingIdeas && existingIdeas.length > 0 && !body.regenerate) {
      return NextResponse.json({
        ideas: existingIdeas,
        cached: true,
      })
    }

    // Generate new post ideas with content mode and options
    const ideas = await generateQuickPostIdeas(
      {
        title: topic.title,
        summary: topic.summary,
        context: topic.context || undefined,
        category: topic.category,
      },
      platform,
      contentMode,
      contentOptions
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
