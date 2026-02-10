/**
 * Restaurant Creative Studio - Generate API
 *
 * Handles AI image generation for:
 * - Food photo enhancement (multimodal with dish reference)
 * - Branded promotional posts
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  generateFoodPhoto,
  generateBrandedPost,
  base64ToDataUrl,
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
import type { OutputFormatId, BrandedPostType } from '@/lib/config/restaurant-studio'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { mode, saveToLibrary = false } = body
    const startTime = Date.now()
    const planTier = usageCheck.planTier!
    const features = getFeatureAccess(planTier)

    // ============================================
    // FOOD PHOTO MODE
    // ============================================
    if (mode === 'food_photo') {
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
        return NextResponse.json(
          { error: 'Dish photo is required' },
          { status: 400 }
        )
      }

      if (!outputFormat) {
        return NextResponse.json(
          { error: 'Output format is required' },
          { status: 400 }
        )
      }

      // Feature gate: check output format access
      if (!isOutputFormatAllowed(planTier, outputFormat)) {
        return NextResponse.json(
          { error: 'This output format requires a paid plan. Upgrade to unlock all formats.' },
          { status: 403 }
        )
      }

      // Feature gate: check style access
      if (style && !isStyleAllowed(planTier, style)) {
        return NextResponse.json(
          { error: 'This style requires a paid plan. Upgrade to unlock all styles.' },
          { status: 403 }
        )
      }

      console.log('[Creative Studio API] Generating food photo...', {
        outputFormat,
        cuisineType,
        hasDescription: !!dishDescription,
        hasStyleReference: !!styleReferenceBase64,
      })

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
        // Log failed generation
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

      // Log successful generation
      await logGeneration({
        companyId: user.companyId,
        mode: 'food_photo',
        outputFormat: outputFormat as OutputFormatId,
        aiModel: result.model,
        success: true,
        generationTime: Date.now() - startTime,
      })

      // Optionally save to library
      let savedContent = null
      if (saveToLibrary) {
        savedContent = await createStudioContent({
          companyId: user.companyId,
          mode: 'food_photo',
          outputFormat: outputFormat as OutputFormatId,
          generatedImageUrl: base64ToDataUrl(result.imageBase64),
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
    // BRANDED POST MODE
    // ============================================
    if (mode === 'branded_post') {
      // Feature gate: branded posts require paid plan
      if (!features.brandedPosts) {
        return NextResponse.json(
          { error: 'Branded posts require a paid plan. Upgrade to create branded content.' },
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

      // Feature gate: custom post type requires Pro or Max
      if (postType === 'custom' && !features.customPosts) {
        return NextResponse.json(
          { error: 'Custom posts require a Pro or Max plan. Upgrade to unlock freeform creation.' },
          { status: 403 }
        )
      }

      if (!postType) {
        return NextResponse.json(
          { error: 'Post type is required' },
          { status: 400 }
        )
      }

      // Get brand kit if specified
      let brandKit = null
      if (brandKitId) {
        brandKit = await getBrandKitById(brandKitId)
      }

      console.log('[Creative Studio API] Generating branded post...', {
        postType,
        hasHeadline: !!headline,
        hasBrandKit: !!brandKit,
        hasSourceImage: !!sourceImageBase64,
        hasLogo: !!logoBase64,
      })

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
        // Log failed generation
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

      // Log successful generation
      await logGeneration({
        companyId: user.companyId,
        mode: 'branded_post',
        aiModel: result.model,
        success: true,
        generationTime: Date.now() - startTime,
      })

      // Optionally save to library
      let savedContent = null
      if (saveToLibrary) {
        savedContent = await createStudioContent({
          companyId: user.companyId,
          brandKitId: brandKitId || undefined,
          mode: 'branded_post',
          generatedImageUrl: base64ToDataUrl(result.imageBase64),
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
      { error: 'Invalid mode. Use "food_photo" or "branded_post"' },
      { status: 400 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('[Creative Studio API] Generation error:', {
      message: errorMessage,
      stack: errorStack,
      error,
    })
    return NextResponse.json(
      { error: 'Something went wrong generating your image. Please try again.' },
      { status: 500 }
    )
  }
}
