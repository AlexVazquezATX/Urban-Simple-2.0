/**
 * Inspiration Topics API
 * GET - List topics with filters
 * POST - Create a manual topic
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getTopicsForDate,
  createTopic,
} from '@/lib/services/inspiration-service'
import type { InspirationCategory, InspirationStatus } from '@prisma/client'

// Get topics with optional filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = user.companyId

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const categoryParam = searchParams.get('category')
    const statusParam = searchParams.get('status')

    const forDate = dateParam ? new Date(dateParam) : new Date()
    forDate.setHours(0, 0, 0, 0)

    const filters: {
      status?: InspirationStatus
      category?: InspirationCategory
    } = {}

    if (statusParam) {
      filters.status = statusParam as InspirationStatus
    }
    if (categoryParam) {
      filters.category = categoryParam as InspirationCategory
    }

    const topics = await getTopicsForDate(companyId, forDate, filters)

    return NextResponse.json({ topics })
  } catch (error) {
    console.error('Failed to get topics:', error)
    return NextResponse.json({ error: 'Failed to get topics' }, { status: 500 })
  }
}

// Create a manual topic
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = user.companyId

    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.summary || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, summary, category' },
        { status: 400 }
      )
    }

    const forDate = body.forDate ? new Date(body.forDate) : new Date()
    forDate.setHours(0, 0, 0, 0)

    const topic = await createTopic({
      companyId,
      title: body.title,
      summary: body.summary,
      context: body.context,
      category: body.category as InspirationCategory,
      subcategory: body.subcategory,
      sourceType: 'manual',
      sourceUrl: body.sourceUrl,
      sourceName: body.sourceName,
      postIdeas: body.postIdeas || [],
      suggestedHooks: body.suggestedHooks || [],
      relatedHashtags: body.relatedHashtags || [],
      relevanceScore: body.relevanceScore || 0.7,
      forDate,
    })

    return NextResponse.json({ topic }, { status: 201 })
  } catch (error) {
    console.error('Failed to create topic:', error)
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    )
  }
}
