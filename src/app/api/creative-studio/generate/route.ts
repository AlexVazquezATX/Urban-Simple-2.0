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
import type { OutputFormatId, BrandedPostType } from '@/lib/config/restaurant-studio'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mode, saveToLibrary = false } = body

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
      })

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to generate image. Please try again.' },
          { status: 500 }
        )
      }

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
      const {
        postType,
        headline,
        brandKitId,
        style,
        aspectRatio = '1:1',
        logoBase64,
      } = body

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
      })

      const result = await generateBrandedPost({
        postType: postType as BrandedPostType,
        headline,
        restaurantName: brandKit?.restaurantName,
        primaryColor: brandKit?.primaryColor,
        secondaryColor: brandKit?.secondaryColor || undefined,
        style: style || brandKit?.preferredStyle,
        aspectRatio,
        logoBase64,
      })

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to generate image. Please try again.' },
          { status: 500 }
        )
      }

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
      { error: `Failed to generate image: ${errorMessage}` },
      { status: 500 }
    )
  }
}
