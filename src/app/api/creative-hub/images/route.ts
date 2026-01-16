import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  createImage,
  getImagesByCompany,
  getImageStats,
} from '@/lib/services/creative-service'
import type { ImageType } from '@/lib/services/creative-service'

// GET - List images for company
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const imageType = searchParams.get('imageType') as ImageType | null
    const category = searchParams.get('category')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')
    const includeStats = searchParams.get('includeStats') === 'true'

    const images = await getImagesByCompany(user.companyId, {
      imageType: imageType || undefined,
      category: category || undefined,
      projectId: projectId || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
    })

    if (includeStats) {
      const stats = await getImageStats(user.companyId)
      return NextResponse.json({ images, stats })
    }

    return NextResponse.json({ images })
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    )
  }
}

// POST - Upload/create image
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const image = await createImage({
      companyId: user.companyId,
      projectId: body.projectId,
      name: body.name,
      imageUrl: body.imageUrl,
      imageBase64: body.imageBase64,
      imageType: body.imageType,
      aspectRatio: body.aspectRatio || '1:1',
      width: body.width,
      height: body.height,
      isAiGenerated: body.isAiGenerated || false,
      aiPrompt: body.aiPrompt,
      aiModel: body.aiModel,
      tags: body.tags || [],
      category: body.category,
    })

    return NextResponse.json(image)
  } catch (error) {
    console.error('Error creating image:', error)
    return NextResponse.json(
      { error: 'Failed to create image' },
      { status: 500 }
    )
  }
}
