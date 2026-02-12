/**
 * Restaurant Creative Studio - Content API
 *
 * CRUD operations for generated studio content
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  createStudioContent,
  getContentByCompany,
  getContentById,
  getRecentContent,
  getStudioStats,
  updateContent,
  updateContentStatus,
  deleteContent,
} from '@/lib/services/restaurant-studio-service'
import type { GenerationMode, OutputFormatId } from '@/lib/config/restaurant-studio'

// GET - List content for company
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const mode = searchParams.get('mode') as GenerationMode | null
    const status = searchParams.get('status')
    const outputFormat = searchParams.get('outputFormat')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const includeStats = searchParams.get('includeStats') === 'true'
    const recentOnly = searchParams.get('recent') === 'true'

    // Fetch single content item by ID (with ownership check)
    if (id) {
      const item = await getContentById(id, user.companyId)
      return NextResponse.json({ content: item ? [item] : [] })
    }

    // Quick recent content fetch for dashboard
    if (recentOnly) {
      const content = await getRecentContent(
        user.companyId,
        limit ? parseInt(limit) : 6
      )
      return NextResponse.json({ content })
    }

    const content = await getContentByCompany(user.companyId, {
      mode: mode || undefined,
      status: status || undefined,
      outputFormat: outputFormat || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    })

    if (includeStats) {
      const stats = await getStudioStats(user.companyId)
      return NextResponse.json({ content, stats })
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

// POST - Create/save content
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.mode) {
      return NextResponse.json(
        { error: 'Mode is required' },
        { status: 400 }
      )
    }

    const content = await createStudioContent({
      companyId: user.companyId,
      brandKitId: body.brandKitId,
      mode: body.mode as GenerationMode,
      outputFormat: body.outputFormat as OutputFormatId | undefined,
      sourceImageUrl: body.sourceImageUrl,
      generatedImageUrl: body.generatedImageUrl,
      headline: body.headline,
      bodyText: body.bodyText,
      hashtags: body.hashtags || [],
      aiPrompt: body.aiPrompt,
      aiModel: body.aiModel,
      status: body.status || 'saved',
      platform: body.platform,
    })

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    )
  }
}

// PUT - Update content
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }

    // Quick status update
    if (body.status && Object.keys(body).length === 2) {
      const content = await updateContentStatus(body.id, body.status)
      return NextResponse.json({ content })
    }

    // Full update
    const content = await updateContent(body.id, {
      headline: body.headline,
      bodyText: body.bodyText,
      hashtags: body.hashtags,
      status: body.status,
      platform: body.platform,
    })

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    )
  }
}

// DELETE - Remove content
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }

    await deleteContent(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting content:', error)
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    )
  }
}
