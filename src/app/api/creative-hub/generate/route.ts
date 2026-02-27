import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateImage } from '@/lib/ai/content-image-generator'
import { getBrandAssetsByIds, incrementAssetUsage } from '@/lib/services/brand-asset-service'
import type { StylePreset, AspectRatio, ReferenceMode } from '@/lib/config/content-studio'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      prompt,
      stylePreset,
      aspectRatio = '1:1',
      brandAssetIds = [],
      referenceImages = [],
      referenceModes = [],
    } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Resolve brand asset IDs to URLs (server-side fetch avoids client payload bloat)
    let brandAssetUrls: string[] = []
    if (brandAssetIds.length > 0) {
      const assets = await getBrandAssetsByIds(brandAssetIds)
      brandAssetUrls = assets.map((a) => a.imageUrl)
    }

    const result = await generateImage({
      prompt: prompt.trim(),
      stylePreset: stylePreset as StylePreset | null,
      aspectRatio: aspectRatio as AspectRatio,
      brandAssetUrls,
      referenceImageBase64s: referenceImages,
      referenceModes: referenceModes as ReferenceMode[],
    })

    if (!result) {
      return NextResponse.json(
        { error: 'All image generation models failed. Please try again.' },
        { status: 500 }
      )
    }

    // Track brand asset usage
    if (brandAssetIds.length > 0) {
      await incrementAssetUsage(brandAssetIds).catch(console.error)
    }

    return NextResponse.json({
      image: {
        imageBase64: result.imageBase64,
        aspectRatio: result.aspectRatio,
        model: result.model,
      },
      prompt: result.prompt,
    })
  } catch (error) {
    console.error('[Creative Hub Generate] Error:', error)
    const message = error instanceof Error ? error.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
