import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  createContent,
  getContentByCompany,
  getContentStats,
} from '@/lib/services/creative-service'
import type { Platform, ContentType } from '@/lib/services/creative-service'

// GET - List content for company
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') as Platform | null
    const contentType = searchParams.get('contentType') as ContentType | null
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')
    const includeStats = searchParams.get('includeStats') === 'true'

    const content = await getContentByCompany(user.companyId, {
      platform: platform || undefined,
      contentType: contentType || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
    })

    if (includeStats) {
      const stats = await getContentStats(user.companyId)
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

// POST - Create new content
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const content = await createContent({
      projectId: body.projectId,
      contentType: body.contentType,
      platform: body.platform,
      headline: body.headline,
      primaryText: body.primaryText,
      description: body.description,
      callToAction: body.callToAction,
      hashtags: body.hashtags || [],
      adFormat: body.adFormat,
      imageId: body.imageId,
      isAiGenerated: body.isAiGenerated ?? true,
      aiModel: body.aiModel,
      aiGenerationData: body.aiGenerationData,
      variationGroup: body.variationGroup,
      variationLabel: body.variationLabel,
    })

    return NextResponse.json(content)
  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    )
  }
}
