/**
 * Content Studio - Unified AI Image Generator
 *
 * Single generation pipeline for all content types.
 * Supports freeform prompts, brand assets, and reference images
 * via multimodal Gemini input.
 */

import { GoogleGenAI } from '@google/genai'
import { buildPrompt, type StylePreset, type AspectRatio } from '@/lib/config/content-studio'

// Model hierarchy (best to fallback)
const IMAGE_MODELS = {
  GEMINI_3_PRO: 'gemini-3-pro-image-preview',
  IMAGEN_4: 'imagen-4.0-generate-001',
  IMAGEN_3: 'imagen-3.0-generate-002',
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

  // Assemble the final prompt
  const assembledPrompt = buildPrompt({
    prompt: userPrompt,
    stylePreset,
    aspectRatio,
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

  const hasMultimodalInput = parts.length > 1

  // Try Gemini 3 Pro (supports multimodal)
  try {
    console.log(`[Content Studio] Trying ${IMAGE_MODELS.GEMINI_3_PRO}...`)

    const response = await ai.models.generateContent({
      model: IMAGE_MODELS.GEMINI_3_PRO,
      contents: { parts },
      config: {
        responseModalities: ['image', 'text'],
      },
    })

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      const anyPart = part as { inlineData?: { data: string; mimeType: string } }
      if (anyPart.inlineData?.data) {
        console.log('[Content Studio] Success with Gemini 3 Pro')
        return {
          imageBase64: anyPart.inlineData.data,
          prompt: assembledPrompt,
          model: IMAGE_MODELS.GEMINI_3_PRO,
          aspectRatio,
        }
      }
    }
    throw new Error('No image in response')
  } catch (error) {
    console.error('[Content Studio] Gemini 3 Pro failed:', error)
  }

  // Fallback to Imagen 4 (text-only — no multimodal support)
  if (hasMultimodalInput) {
    console.log('[Content Studio] Falling back to text-only models (brand assets/references will not be used)')
  }

  try {
    console.log(`[Content Studio] Trying ${IMAGE_MODELS.IMAGEN_4}...`)

    const response = await ai.models.generateImages({
      model: IMAGE_MODELS.IMAGEN_4,
      prompt: assembledPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio,
      },
    })

    const generatedImage = response.generatedImages?.[0]
    if (generatedImage?.image?.imageBytes) {
      console.log('[Content Studio] Success with Imagen 4')
      return {
        imageBase64: generatedImage.image.imageBytes,
        prompt: assembledPrompt,
        model: IMAGE_MODELS.IMAGEN_4,
        aspectRatio,
      }
    }
    throw new Error('No image in Imagen 4 response')
  } catch (error) {
    console.error('[Content Studio] Imagen 4 failed:', error)
  }

  // Final fallback to Imagen 3
  try {
    console.log(`[Content Studio] Trying ${IMAGE_MODELS.IMAGEN_3}...`)

    const response = await ai.models.generateImages({
      model: IMAGE_MODELS.IMAGEN_3,
      prompt: assembledPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio,
      },
    })

    const generatedImage = response.generatedImages?.[0]
    if (generatedImage?.image?.imageBytes) {
      console.log('[Content Studio] Success with Imagen 3')
      return {
        imageBase64: generatedImage.image.imageBytes,
        prompt: assembledPrompt,
        model: IMAGE_MODELS.IMAGEN_3,
        aspectRatio,
      }
    }
    throw new Error('No image in Imagen 3 response')
  } catch (error) {
    console.error('[Content Studio] Imagen 3 failed:', error)
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
