/**
 * Content Studio - Unified AI Image Generator
 *
 * Single generation pipeline for all content types.
 * Supports freeform prompts, brand assets, and reference images
 * via multimodal Gemini input.
 */

import { GoogleGenAI } from '@google/genai'
import { buildPrompt, type StylePreset, type AspectRatio } from '@/lib/config/content-studio'

// Model hierarchy: 3.1 Flash (fast + refined) → 3.0 Pro (fallback)
// Both are multimodal — reference images and brand assets always work.
const IMAGE_MODELS = {
  GEMINI_31_FLASH: 'gemini-3.1-flash-image-preview',
  GEMINI_3_PRO: 'gemini-3-pro-image-preview',
} as const

function getGenAI(): GoogleGenAI {
  const apiKey =
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ''

  if (!apiKey) {
    console.error('[Content Studio] ERROR: No Gemini API key found!')
  }

  return new GoogleGenAI({ apiKey })
}

// ============================================
// TYPES
// ============================================

export interface GenerateImageParams {
  prompt: string
  stylePreset?: StylePreset | null
  aspectRatio: AspectRatio
  brandAssetUrls?: string[] // Up to 3 Supabase Storage URLs
  referenceImageBase64s?: string[] // Up to 3 reference images as data URLs
  brandContext?: {
    restaurantName?: string
    primaryColor?: string
    secondaryColor?: string
  } | null
  applyBrandContext?: boolean
}

export interface GeneratedImage {
  imageBase64: string
  prompt: string // The assembled prompt that was sent
  model: string
  aspectRatio: string
}

// ============================================
// UNIFIED IMAGE GENERATION
// ============================================

/**
 * Generate an image from a freeform prompt with optional assets and references.
 */
export async function generateImage(
  params: GenerateImageParams
): Promise<GeneratedImage | null> {
  const ai = getGenAI()

  const {
    prompt: userPrompt,
    stylePreset,
    aspectRatio,
    brandAssetUrls = [],
    referenceImageBase64s = [],
    brandContext,
    applyBrandContext = true,
  } = params

  // Assemble the final prompt (aspect ratio handled natively via imageConfig)
  const assembledPrompt = buildPrompt({
    prompt: userPrompt,
    stylePreset,
    brandContext,
    applyBrandContext,
    brandAssetCount: brandAssetUrls.length,
    referenceImageCount: referenceImageBase64s.length,
  })

  console.log('[Content Studio] Generating image...', {
    stylePreset: stylePreset || 'none',
    aspectRatio,
    brandAssets: brandAssetUrls.length,
    referenceImages: referenceImageBase64s.length,
    promptLength: assembledPrompt.length,
  })

  // Build multimodal content parts: text first, then reference images, then brand assets
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: assembledPrompt },
  ]

  // Add reference images (mood/style)
  for (const refBase64 of referenceImageBase64s) {
    const parsed = parseBase64Image(refBase64)
    if (parsed) {
      parts.push({ inlineData: parsed })
    }
  }

  // Add brand assets (fetched server-side from URLs)
  for (const assetUrl of brandAssetUrls) {
    const fetched = await fetchImageAsBase64(assetUrl)
    if (fetched) {
      parts.push({ inlineData: fetched })
    }
  }

  // Shared config — native aspect ratio + resolution via imageConfig
  const sharedConfig = {
    responseModalities: ['IMAGE', 'TEXT'] as const,
    imageConfig: {
      aspectRatio,
      imageSize: '1K' as const,
    },
  }

  // Models to try in order — both are multimodal, so reference images always work
  const models = [
    { id: IMAGE_MODELS.GEMINI_31_FLASH, label: 'Gemini 3.1 Flash' },
    { id: IMAGE_MODELS.GEMINI_3_PRO, label: 'Gemini 3.0 Pro' },
  ]

  for (const model of models) {
    try {
      console.log(`[Content Studio] Trying ${model.label} (${model.id})...`)

      const response = await ai.models.generateContent({
        model: model.id,
        contents: { parts },
        config: sharedConfig,
      })

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        const anyPart = part as { inlineData?: { data: string; mimeType: string } }
        if (anyPart.inlineData?.data) {
          console.log(`[Content Studio] Success with ${model.label}`)
          return {
            imageBase64: anyPart.inlineData.data,
            prompt: assembledPrompt,
            model: model.id,
            aspectRatio,
          }
        }
      }
      throw new Error('No image in response')
    } catch (error) {
      console.error(`[Content Studio] ${model.label} failed:`, error)
    }
  }

  console.error('[Content Studio] All models failed')
  return null
}

// ============================================
// HELPERS
// ============================================

function parseBase64Image(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (match) {
    return { mimeType: match[1], data: match[2] }
  }
  // If it's already raw base64, assume JPEG
  if (dataUrl.length > 100) {
    return { mimeType: 'image/jpeg', data: dataUrl }
  }
  return null
}

async function fetchImageAsBase64(
  url: string
): Promise<{ mimeType: string; data: string } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[Content Studio] Failed to fetch asset: ${response.status} ${url}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = response.headers.get('content-type') || 'image/jpeg'

    return { mimeType, data: base64 }
  } catch (error) {
    console.error('[Content Studio] Failed to fetch asset:', error)
    return null
  }
}

export { base64ToDataUrl, isValidBase64Image } from '@/lib/ai/restaurant-image-generator'
