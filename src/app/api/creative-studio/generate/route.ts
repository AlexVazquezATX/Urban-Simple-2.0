/**
 * Content Studio - Generate API
 *
 * Unified endpoint for AI image generation.
 * Supports freeform prompts, brand assets, reference images, and style presets.
 *
 * Also maintains backward compatibility with legacy food_photo/branded_post modes.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  generateImage,
  base64ToDataUrl,
} from '@/lib/ai/content-image-generator'
import {
  generateFoodPhoto,
  generateBrandedPost,
  base64ToDataUrl as legacyBase64ToDataUrl,
} from '@/lib/ai/restaurant-image-generator'
import {
  createStudioContent,
  getBrandKitById,
} from '@/lib/services/restaurant-studio-service'
import {
  canGenerate,
  logGeneration,
} from '@/lib/services/studio-admin-service'
import {
  getFeatureAccess,
  isStyleAllowed,
  isOutputFormatAllowed,
} from '@/lib/config/studio-plans'
import type { AspectRatio, StylePreset } from '@/lib/config/content-studio'
import type { OutputFormatId, BrandedPostType } from '@/lib/config/restaurant-studio'

const VALID_ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:5', '9:16', '16:9', '3:4']

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 20 generations per user per 5 minutes
    const rl = checkRateLimit(`generate:${user.id}`, { limit: 20, windowSeconds: 300 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      )
    }

    // Check if user can generate (has remaining credits)
    const usageCheck = await canGenerate(user.companyId)
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason || 'Generation limit reached' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { mode } = body
    const startTime = Date.now()
    const planTier = usageCheck.planTier!

    // ============================================
    // NEW: CONTENT STUDIO MODE (unified freeform)
    // ============================================
    if (mode === 'content_studio' || !mode) {
      const {
        prompt,
        stylePreset,
        aspectRatio = '1:1',
        brandAssetUrls,
        referenceImages,
        brandKitId,
        applyBrandContext = true,
      } = body

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return NextResponse.json(
          { error: 'A prompt is required' },
          { status: 400 }
        )
      }

      if (!VALID_ASPECT_RATIOS.includes(aspectRatio)) {
        return NextResponse.json(
          { error: 'Invalid aspect ratio' },
          { status: 400 }
        )
      }

      // Get brand kit for context if specified
      let brandContext = null
      if (brandKitId && applyBrandContext) {
        const brandKit = await getBrandKitById(brandKitId)
        if (brandKit) {
          brandContext = {
            restaurantName: brandKit.restaurantName,
            primaryColor: brandKit.primaryColor,
            secondaryColor: brandKit.secondaryColor || undefined,
          }
        }
      }

      console.log('[Content Studio API] Generating...', {
        promptLength: prompt.length,
        stylePreset: stylePreset || 'none',
        aspectRatio,
        brandAssets: brandAssetUrls?.length || 0,
        referenceImages: referenceImages?.length || 0,
        hasBrandContext: !!brandContext,
      })

      const result = await generateImage({
        prompt: prompt.trim(),
        stylePreset: (stylePreset as StylePreset) || null,
        aspectRatio: aspectRatio as AspectRatio,
        brandAssetUrls: brandAssetUrls || [],
        referenceImageBase64s: referenceImages || [],
        brandContext,
        applyBrandContext,
      })

      if (!result) {
        await logGeneration({
          companyId: user.companyId,
          mode: 'content_studio',
          success: false,
          errorMessage: 'All models failed to generate image',
          generationTime: Date.now() - startTime,
        })
        return NextResponse.json(
          { error: 'Failed to generate image. Please try again.' },
          { status: 500 }
        )
      }

      // Log success
      await logGeneration({
        companyId: user.companyId,
        mode: 'content_studio',
        aiModel: result.model,
        success: true,
        generationTime: Date.now() - startTime,
      })

      return NextResponse.json({
        image: {
          imageBase64: result.imageBase64,
          aspectRatio: result.aspectRatio,
          model: result.model,
        },
        prompt: result.prompt,
      })
    }

    // ============================================
    // LEGACY: FOOD PHOTO MODE
    // ============================================
    if (mode === 'food_photo') {
      const features = getFeatureAccess(planTier)
      const { saveToLibrary = false } = body
      const {
        dishPhotoBase64,
        dishDescription,
        outputFormat,
        cuisineType,
        style,
        styleReferenceBase64,
        additionalInstructions,
      } = body

      if (!dishPhotoBase64) {
        return NextResponse.json({ error: 'Dish photo is required' }, { status: 400 })
      }
      if (!outputFormat) {
        return NextResponse.json({ error: 'Output format is required' }, { status: 400 })
      }
      if (!isOutputFormatAllowed(planTier, outputFormat)) {
        return NextResponse.json(
          { error: 'This output format requires a paid plan.' },
          { status: 403 }
        )
      }
      if (style && !isStyleAllowed(planTier, style)) {
        return NextResponse.json(
          { error: 'This style requires a paid plan.' },
          { status: 403 }
        )
      }

      const result = await generateFoodPhoto({
        dishPhotoBase64,
        dishDescription,
        outputFormat: outputFormat as OutputFormatId,
        cuisineType,
        style,
        styleReferenceBase64,
        additionalInstructions,
      })

      if (!result) {
        await logGeneration({
          companyId: user.companyId,
          mode: 'food_photo',
          outputFormat: outputFormat as OutputFormatId,
          success: false,
          errorMessage: 'Failed to generate image',
          generationTime: Date.now() - startTime,
        })
        return NextResponse.json(
          { error: 'Failed to generate image. Please try again.' },
          { status: 500 }
        )
      }

      await logGeneration({
        companyId: user.companyId,
        mode: 'food_photo',
        outputFormat: outputFormat as OutputFormatId,
        aiModel: result.model,
        success: true,
        generationTime: Date.now() - startTime,
      })

      let savedContent = null
      if (saveToLibrary) {
        savedContent = await createStudioContent({
          companyId: user.companyId,
          mode: 'food_photo',
          outputFormat: outputFormat as OutputFormatId,
          generatedImageUrl: legacyBase64ToDataUrl(result.imageBase64),
          aiPrompt: result.prompt,
          aiModel: result.model,
          status: 'saved',
        })
      }

      return NextResponse.json({
        image: {
          imageBase64: result.imageBase64,
          aspectRatio: result.aspectRatio,
          model: result.model,
        },
        savedContent,
      })
    }

    // ============================================
    // LEGACY: BRANDED POST MODE
    // ============================================
    if (mode === 'branded_post') {
      const features = getFeatureAccess(planTier)
      const { saveToLibrary = false } = body

      if (!features.brandedPosts) {
        return NextResponse.json(
          { error: 'Branded posts require a paid plan.' },
          { status: 403 }
        )
      }

      const {
        postType,
        headline,
        brandKitId,
        style,
        aspectRatio = '1:1',
        logoBase64,
        logoPlacement,
        logoSize,
        logoOpacity,
        applyBrandColors = true,
        sourceImageBase64,
        additionalInstructions,
      } = body

      if (postType === 'custom' && !features.customPosts) {
        return NextResponse.json(
          { error: 'Custom posts require a Pro or Max plan.' },
          { status: 403 }
        )
      }
      if (!postType) {
        return NextResponse.json({ error: 'Post type is required' }, { status: 400 })
      }

      let brandKit = null
      if (brandKitId) {
        brandKit = await getBrandKitById(brandKitId)
      }

      const result = await generateBrandedPost({
        postType: postType as BrandedPostType,
        headline,
        restaurantName: brandKit?.restaurantName,
        primaryColor: brandKit?.primaryColor,
        secondaryColor: brandKit?.secondaryColor || undefined,
        applyBrandColors,
        style: style || brandKit?.preferredStyle,
        aspectRatio,
        logoBase64: logoBase64 || undefined,
        logoPlacement: logoBase64 ? logoPlacement : undefined,
        logoSize: logoBase64 ? logoSize : undefined,
        logoOpacity: logoBase64 ? logoOpacity : undefined,
        sourceImageBase64,
        additionalInstructions,
      })

      if (!result) {
        await logGeneration({
          companyId: user.companyId,
          mode: 'branded_post',
          success: false,
          errorMessage: 'Failed to generate image',
          generationTime: Date.now() - startTime,
        })
        return NextResponse.json(
          { error: 'Failed to generate image. Please try again.' },
          { status: 500 }
        )
      }

      await logGeneration({
        companyId: user.companyId,
        mode: 'branded_post',
        aiModel: result.model,
        success: true,
        generationTime: Date.now() - startTime,
      })

      let savedContent = null
      if (saveToLibrary) {
        savedContent = await createStudioContent({
          companyId: user.companyId,
          brandKitId: brandKitId || undefined,
          mode: 'branded_post',
          generatedImageUrl: legacyBase64ToDataUrl(result.imageBase64),
          headline,
          aiPrompt: result.prompt,
          aiModel: result.model,
          status: 'saved',
        })
      }

      return NextResponse.json({
        image: {
          imageBase64: result.imageBase64,
          aspectRatio: result.aspectRatio,
          model: result.model,
        },
        savedContent,
      })
    }

    return NextResponse.json(
      { error: 'Invalid mode. Use "content_studio", "food_photo", or "branded_post"' },
      { status: 400 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Content Studio API] Generation error:', errorMessage)
    return NextResponse.json(
      { error: 'Something went wrong generating your image. Please try again.' },
      { status: 500 }
    )
  }
}
