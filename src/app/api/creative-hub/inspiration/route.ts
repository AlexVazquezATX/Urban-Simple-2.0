/**
 * Daily Inspiration API
 * GET - Get today's briefing with topics
 * POST - Trigger generation of new topics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getOrCreateBriefing,
  getBriefingByDate,
  updateBriefing,
  createManyTopics,
  getInspirationStats,
} from '@/lib/services/inspiration-service'
import {
  generateDailyTopics,
  generateBriefingSummary,
} from '@/lib/ai/inspiration-generator'

// Get today's briefing
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = user.companyId

    // Get date from query or use today
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const forDate = dateParam ? new Date(dateParam) : new Date()
    forDate.setHours(0, 0, 0, 0)

    // Get or create briefing
    const briefing = await getBriefingByDate(companyId, forDate)

    if (!briefing) {
      // Return empty state if no briefing exists yet
      return NextResponse.json({
        briefing: null,
        topics: [],
        stats: {
          total: 0,
          byStatus: {},
          byCategory: {},
        },
        message: 'No briefing for this date. Click refresh to generate topics.',
      })
    }

    // Get stats
    const stats = await getInspirationStats(companyId, forDate)

    return NextResponse.json({
      briefing: {
        id: briefing.id,
        forDate: briefing.forDate,
        status: briefing.status,
        headline: briefing.headline,
        greeting: briefing.greeting,
        summary: briefing.summary,
        totalDiscovered: briefing.totalDiscovered,
        totalApproved: briefing.totalApproved,
        generatedAt: briefing.generatedAt,
      },
      topics: briefing.topics,
      stats,
    })
  } catch (error) {
    console.error('Failed to get inspiration briefing:', error)
    return NextResponse.json(
      { error: 'Failed to get briefing' },
      { status: 500 }
    )
  }
}

// Trigger topic generation
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = user.companyId
    const userName = user.firstName || undefined

    // Get or parse date
    const body = await request.json().catch(() => ({}))
    const forDate = body.date ? new Date(body.date) : new Date()
    forDate.setHours(0, 0, 0, 0)

    // Create or get briefing
    const briefing = await getOrCreateBriefing(companyId, forDate)

    // Update status to generating
    await updateBriefing(briefing.id, { status: 'generating' })

    try {
      // Generate topics using AI
      const result = await generateDailyTopics()

      if (!result.success || result.topics.length === 0) {
        await updateBriefing(briefing.id, {
          status: 'failed',
          errorMessage: result.errors.join('; ') || 'No topics generated',
        })

        return NextResponse.json({
          success: false,
          briefing,
          errors: result.errors,
        })
      }

      // Save topics to database
      const topicInputs = result.topics.map((topic) => ({
        companyId,
        title: topic.title,
        summary: topic.summary,
        context: topic.context,
        category: topic.category,
        subcategory: topic.subcategory,
        sourceUrl: topic.sourceUrl,
        sourceName: topic.sourceName,
        postIdeas: topic.postIdeas,
        suggestedHooks: topic.suggestedHooks,
        relatedHashtags: topic.relatedHashtags,
        relevanceScore: topic.relevanceScore,
        trendingScore: topic.trendingScore,
        expiresAt: topic.expiresAt,
        forDate,
        briefingId: briefing.id,
      }))

      await createManyTopics(topicInputs)

      // Generate briefing summary
      const briefingSummary = await generateBriefingSummary(
        result.topics,
        userName
      )

      // Update briefing with results
      await updateBriefing(briefing.id, {
        status: 'ready',
        headline: briefingSummary.headline,
        greeting: briefingSummary.greeting,
        summary: briefingSummary.summary,
        aiModel: 'gemini-2.0-flash-exp',
        generatedAt: new Date(),
        generationTime: result.generationTime,
        totalDiscovered: result.topics.length,
      })

      // Fetch updated briefing with topics
      const updatedBriefing = await getBriefingByDate(companyId, forDate)

      return NextResponse.json({
        success: true,
        briefing: updatedBriefing,
        topicsGenerated: result.topics.length,
        generationTime: result.generationTime,
      })
    } catch (genError) {
      console.error('Topic generation failed:', genError)
      await updateBriefing(briefing.id, {
        status: 'failed',
        errorMessage:
          genError instanceof Error ? genError.message : 'Generation failed',
      })

      return NextResponse.json(
        { error: 'Topic generation failed', details: String(genError) },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Failed to trigger topic generation:', error)
    return NextResponse.json(
      { error: 'Failed to generate topics' },
      { status: 500 }
    )
  }
}
