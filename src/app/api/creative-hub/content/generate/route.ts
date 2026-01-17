import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  generateContentIdeas,
  generateContent,
  generateVariations,
  improveContent,
  generateHashtags,
} from '@/lib/ai/creative-generator'
import {
  generateCreativeImage,
  getFallbackImage,
} from '@/lib/ai/creative-image-generator'
import type { Platform, ContentType, Tone, ServiceHighlight } from '@/lib/ai/creative-generator'
import type { ImageType, AspectRatio } from '@/lib/ai/creative-image-generator'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'ideas': {
        const ideas = await generateContentIdeas({
          contentType: params.contentType as ContentType,
          platform: params.platform as Platform,
          serviceHighlight: params.serviceHighlight as ServiceHighlight,
          tone: params.tone as Tone,
          targetAudience: params.targetAudience,
          topic: params.topic,
          includeStats: params.includeStats,
          callToAction: params.callToAction,
        })
        return NextResponse.json({ ideas })
      }

      case 'content': {
        const content = await generateContent(
          {
            contentType: params.contentType as ContentType,
            platform: params.platform as Platform,
            serviceHighlight: params.serviceHighlight as ServiceHighlight,
            tone: params.tone as Tone,
            targetAudience: params.targetAudience,
            callToAction: params.callToAction,
          },
          params.selectedIdea
        )

        // Optionally generate image if requested
        let image = null
        if (params.generateImage) {
          // Determine aspect ratio based on platform
          let aspectRatio: AspectRatio = '1:1' // Default square
          if (params.platform === 'instagram') {
            aspectRatio = '1:1' // Force square for Instagram
          } else if (params.platform === 'linkedin' || params.platform === 'facebook') {
            aspectRatio = '16:9' // Landscape for these platforms
          }

          const imageResult = await generateCreativeImage({
            imageType: (params.imageType || 'promotional') as ImageType,
            aspectRatio: (params.aspectRatio || aspectRatio) as AspectRatio,
            customPrompt: params.selectedIdea?.suggestedImage,
            serviceContext: params.serviceHighlight,
            style: 'photorealistic',
            imageStyle: params.imageStyle, // Pass the image style (lifestyle, minimal, etc.)
            platform: params.platform, // Pass the platform for dimension hints
            topic: params.topic, // Pass topic for context
          })

          if (imageResult) {
            image = {
              imageBase64: imageResult.imageBase64,
              prompt: imageResult.prompt,
              model: imageResult.model,
            }
          } else {
            // Fallback to curated image
            image = {
              imageUrl: getFallbackImage(
                (params.imageType || 'promotional') as ImageType
              ),
              isFallback: true,
            }
          }
        }

        return NextResponse.json({ content, image })
      }

      case 'variations': {
        const variations = await generateVariations(
          {
            contentType: params.contentType as ContentType,
            platform: params.platform as Platform,
            serviceHighlight: params.serviceHighlight as ServiceHighlight,
            tone: params.tone as Tone,
            targetAudience: params.targetAudience,
          },
          params.baseContent,
          params.count || 3
        )
        return NextResponse.json({ variations })
      }

      case 'improve': {
        const improved = await improveContent(
          params.content,
          params.platform as Platform,
          params.instructions
        )
        return NextResponse.json({ content: improved })
      }

      case 'hashtags': {
        const hashtags = await generateHashtags(
          params.content,
          params.platform as Platform
        )
        return NextResponse.json({ hashtags })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Creative Hub generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
