import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  generateCreativeImage,
  generateImageVariations,
  getFallbackImage,
  getAspectRatioDimensions,
} from '@/lib/ai/creative-image-generator'
import { createImage } from '@/lib/services/creative-service'
import type { ImageType, AspectRatio } from '@/lib/ai/creative-image-generator'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      action,
      imageType,
      aspectRatio,
      customPrompt,
      serviceContext,
      style,
      projectId,
      name,
      saveToLibrary,
      imageStyle,
      platform,
      topic,
    } = body

    if (action === 'generate') {
      const result = await generateCreativeImage({
        imageType: imageType as ImageType,
        aspectRatio: (aspectRatio || '1:1') as AspectRatio,
        customPrompt,
        serviceContext,
        style: style || 'photorealistic',
        imageStyle, // lifestyle, minimal, behindScenes, etc.
        platform, // instagram, linkedin, facebook
        topic, // topic context for more relevant images
      })

      if (result) {
        // Optionally save to library
        if (saveToLibrary) {
          const dimensions = getAspectRatioDimensions(result.aspectRatio)
          const savedImage = await createImage({
            companyId: user.companyId,
            projectId,
            name: name || `AI Generated - ${imageType}`,
            imageBase64: result.imageBase64,
            imageType: imageType as ImageType,
            aspectRatio: result.aspectRatio,
            width: dimensions.width,
            height: dimensions.height,
            isAiGenerated: true,
            aiPrompt: result.prompt,
            aiModel: result.model,
            category: imageType,
          })

          return NextResponse.json({
            image: result,
            savedImage,
          })
        }

        return NextResponse.json({ image: result })
      }

      // Fallback to curated image
      const fallbackUrl = getFallbackImage(imageType as ImageType)
      return NextResponse.json({
        image: {
          imageUrl: fallbackUrl,
          isFallback: true,
        },
        message: 'AI generation failed, using curated image',
      })
    }

    if (action === 'variations') {
      const count = body.count || 4
      const results = await generateImageVariations(
        {
          imageType: imageType as ImageType,
          aspectRatio: (aspectRatio || '1:1') as AspectRatio,
          customPrompt,
          serviceContext,
          style: style || 'photorealistic',
        },
        count
      )

      return NextResponse.json({ images: results })
    }

    if (action === 'fallback') {
      const fallbackUrl = getFallbackImage(imageType as ImageType)
      return NextResponse.json({
        image: {
          imageUrl: fallbackUrl,
          isFallback: true,
        },
      })
    }

    // Save an already-generated image to the library
    if (action === 'save') {
      const { imageBase64, imageUrl } = body

      if (!imageBase64 && !imageUrl) {
        return NextResponse.json(
          { error: 'No image data provided' },
          { status: 400 }
        )
      }

      const dimensions = getAspectRatioDimensions(
        (aspectRatio || '1:1') as AspectRatio,
        platform
      )

      const savedImage = await createImage({
        companyId: user.companyId,
        projectId,
        name: name || `Content Image - ${new Date().toLocaleDateString()}`,
        imageBase64,
        imageUrl,
        imageType: (imageType || 'service_showcase') as ImageType,
        aspectRatio: (aspectRatio || '1:1') as AspectRatio,
        width: dimensions.width,
        height: dimensions.height,
        isAiGenerated: !!imageBase64, // Base64 usually means AI-generated
        category: imageType || 'content',
      })

      return NextResponse.json(savedImage)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
