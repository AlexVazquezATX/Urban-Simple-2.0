/**
 * Restaurant Creative Studio - AI Image Generator
 *
 * Generates professional food photography and branded content for restaurants.
 * Uses multimodal Gemini input for dish photo enhancement.
 */

import { GoogleGenAI } from '@google/genai'
import {
  buildFoodPhotoPrompt,
  buildBrandedPostPrompt,
  OUTPUT_FORMATS,
  type OutputFormatId,
  type BrandedPostType,
} from '@/lib/config/restaurant-studio'

// Model hierarchy (best to fallback)
const IMAGE_MODELS = {
  GEMINI_3_PRO: 'gemini-3-pro-image-preview', // Nano Banana Pro - best quality
  IMAGEN_4: 'imagen-4.0-generate-001', // Imagen 4 GA
  IMAGEN_3: 'imagen-3.0-generate-002', // Imagen 3 fallback
} as const

// Create fresh instance each time to avoid stale key issues in dev
function getGenAI(): GoogleGenAI {
  const apiKey =
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ''

  if (!apiKey) {
    console.error('[Restaurant Studio] ERROR: No Gemini API key found!')
    console.error('[Restaurant Studio] Set GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY in .env.local')
  } else {
    console.log('[Restaurant Studio] API key found, length:', apiKey.length)
  }

  return new GoogleGenAI({ apiKey })
}

// ============================================
// TYPES
// ============================================

export interface FoodPhotoParams {
  dishPhotoBase64: string // Client-compressed base64 image
  dishDescription?: string
  outputFormat: OutputFormatId
  cuisineType?: string
  style?: string
}

export interface BrandedPostParams {
  postType: BrandedPostType
  headline?: string
  restaurantName?: string
  primaryColor?: string
  secondaryColor?: string
  style?: string
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9'
  logoBase64?: string // Optional logo to include
}

export interface GeneratedImage {
  imageBase64: string
  prompt: string
  model: string
  aspectRatio: string
}

// ============================================
// FOOD PHOTO GENERATION (Multimodal)
// ============================================

/**
 * Generate professional food photography from an amateur dish photo.
 * Uses multimodal Gemini input to reference the original dish.
 */
export async function generateFoodPhoto(
  params: FoodPhotoParams
): Promise<GeneratedImage | null> {
  const ai = getGenAI()

  const { dishPhotoBase64, dishDescription, outputFormat, cuisineType, style } =
    params

  // Build the enhanced prompt
  const prompt = buildFoodPhotoPrompt({
    dishDescription,
    outputFormat,
    cuisineType,
    style,
  })

  const formatConfig = OUTPUT_FORMATS[outputFormat]

  console.log(
    '[Restaurant Studio] Generating food photo...',
    outputFormat,
    formatConfig.aspectRatio
  )

  // Parse the base64 data URL
  const base64Match = dishPhotoBase64.match(/^data:([^;]+);base64,(.+)$/)
  const mimeType = base64Match?.[1] || 'image/jpeg'
  const imageData = base64Match?.[2] || dishPhotoBase64

  // Build multimodal content with reference image
  const contents = {
    parts: [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: imageData,
        },
      },
    ],
  }

  // Try Gemini 3 Pro Image first
  try {
    console.log(`[Restaurant Studio] Trying ${IMAGE_MODELS.GEMINI_3_PRO}...`)

    const response = await ai.models.generateContent({
      model: IMAGE_MODELS.GEMINI_3_PRO,
      contents,
      config: {
        responseModalities: ['image', 'text'],
      },
    })

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      const anyPart = part as { inlineData?: { data: string; mimeType: string } }
      if (anyPart.inlineData?.data) {
        console.log(
          '[Restaurant Studio] Success with Gemini 3 Pro Image'
        )
        return {
          imageBase64: anyPart.inlineData.data,
          prompt,
          model: IMAGE_MODELS.GEMINI_3_PRO,
          aspectRatio: formatConfig.aspectRatio,
        }
      }
    }
    throw new Error('No image in response')
  } catch (error) {
    console.error('[Restaurant Studio] Gemini 3 Pro failed:', error)
  }

  // Fallback to Imagen 4 (text-only, won't use reference image)
  try {
    console.log(`[Restaurant Studio] Trying ${IMAGE_MODELS.IMAGEN_4}...`)

    // Enhance prompt since we can't use reference image with Imagen
    const imagenPrompt = `${prompt}\n\nCreate a photorealistic, professional food photograph.`

    const response = await ai.models.generateImages({
      model: IMAGE_MODELS.IMAGEN_4,
      prompt: imagenPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: formatConfig.aspectRatio,
      },
    })

    const generatedImage = response.generatedImages?.[0]
    if (generatedImage?.image?.imageBytes) {
      console.log('[Restaurant Studio] Success with Imagen 4')
      return {
        imageBase64: generatedImage.image.imageBytes,
        prompt: imagenPrompt,
        model: IMAGE_MODELS.IMAGEN_4,
        aspectRatio: formatConfig.aspectRatio,
      }
    }
    throw new Error('No image in Imagen 4 response')
  } catch (error) {
    console.error('[Restaurant Studio] Imagen 4 failed:', error)
  }

  // Final fallback to Imagen 3
  try {
    console.log(`[Restaurant Studio] Trying ${IMAGE_MODELS.IMAGEN_3}...`)

    const imagenPrompt = `${prompt}\n\nCreate a photorealistic, professional food photograph.`

    const response = await ai.models.generateImages({
      model: IMAGE_MODELS.IMAGEN_3,
      prompt: imagenPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: formatConfig.aspectRatio,
      },
    })

    const generatedImage = response.generatedImages?.[0]
    if (generatedImage?.image?.imageBytes) {
      console.log('[Restaurant Studio] Success with Imagen 3')
      return {
        imageBase64: generatedImage.image.imageBytes,
        prompt: imagenPrompt,
        model: IMAGE_MODELS.IMAGEN_3,
        aspectRatio: formatConfig.aspectRatio,
      }
    }
    throw new Error('No image in Imagen 3 response')
  } catch (error) {
    console.error('[Restaurant Studio] Imagen 3 failed:', error)
  }

  console.error('[Restaurant Studio] All models failed for food photo')
  return null
}

// ============================================
// BRANDED POST GENERATION
// ============================================

/**
 * Generate branded promotional graphics for restaurants.
 * Uses text-only prompts with brand context.
 */
export async function generateBrandedPost(
  params: BrandedPostParams
): Promise<GeneratedImage | null> {
  const ai = getGenAI()

  const {
    postType,
    headline,
    restaurantName,
    primaryColor,
    secondaryColor,
    style,
    aspectRatio = '1:1',
    logoBase64,
  } = params

  // Build the prompt
  const prompt = buildBrandedPostPrompt({
    postType,
    headline,
    restaurantName,
    primaryColor,
    secondaryColor,
    style,
  })

  console.log('[Restaurant Studio] Generating branded post...', postType)

  // Build content parts
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ]

  // Add logo if provided
  if (logoBase64) {
    const logoMatch = logoBase64.match(/^data:([^;]+);base64,(.+)$/)
    if (logoMatch) {
      parts.push({
        inlineData: {
          mimeType: logoMatch[1],
          data: logoMatch[2],
        },
      })
    }
  }

  const contents = { parts }

  // Try Gemini 3 Pro Image first
  try {
    console.log(`[Restaurant Studio] Trying ${IMAGE_MODELS.GEMINI_3_PRO}...`)

    const response = await ai.models.generateContent({
      model: IMAGE_MODELS.GEMINI_3_PRO,
      contents,
      config: {
        responseModalities: ['image', 'text'],
      },
    })

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      const anyPart = part as { inlineData?: { data: string; mimeType: string } }
      if (anyPart.inlineData?.data) {
        console.log('[Restaurant Studio] Success with Gemini 3 Pro Image')
        return {
          imageBase64: anyPart.inlineData.data,
          prompt,
          model: IMAGE_MODELS.GEMINI_3_PRO,
          aspectRatio,
        }
      }
    }
    throw new Error('No image in response')
  } catch (error) {
    console.error('[Restaurant Studio] Gemini 3 Pro failed:', error)
  }

  // Fallback to Imagen 4 for graphics (no reference image needed)
  try {
    console.log(`[Restaurant Studio] Trying ${IMAGE_MODELS.IMAGEN_4}...`)

    const response = await ai.models.generateImages({
      model: IMAGE_MODELS.IMAGEN_4,
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio,
      },
    })

    const generatedImage = response.generatedImages?.[0]
    if (generatedImage?.image?.imageBytes) {
      console.log('[Restaurant Studio] Success with Imagen 4')
      return {
        imageBase64: generatedImage.image.imageBytes,
        prompt,
        model: IMAGE_MODELS.IMAGEN_4,
        aspectRatio,
      }
    }
    throw new Error('No image in Imagen 4 response')
  } catch (error) {
    console.error('[Restaurant Studio] Imagen 4 failed:', error)
  }

  // Final fallback to Imagen 3
  try {
    console.log(`[Restaurant Studio] Trying ${IMAGE_MODELS.IMAGEN_3}...`)

    const response = await ai.models.generateImages({
      model: IMAGE_MODELS.IMAGEN_3,
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio,
      },
    })

    const generatedImage = response.generatedImages?.[0]
    if (generatedImage?.image?.imageBytes) {
      console.log('[Restaurant Studio] Success with Imagen 3')
      return {
        imageBase64: generatedImage.image.imageBytes,
        prompt,
        model: IMAGE_MODELS.IMAGEN_3,
        aspectRatio,
      }
    }
    throw new Error('No image in Imagen 3 response')
  } catch (error) {
    console.error('[Restaurant Studio] Imagen 3 failed:', error)
  }

  console.error('[Restaurant Studio] All models failed for branded post')
  return null
}

// ============================================
// HELPERS
// ============================================

export function base64ToDataUrl(
  base64: string,
  mimeType: string = 'image/png'
): string {
  return `data:${mimeType};base64,${base64}`
}

export function isValidBase64Image(data: string): boolean {
  try {
    // Check if it's a data URL
    if (data.startsWith('data:image')) {
      const base64Part = data.split(',')[1]
      if (!base64Part) return false
      atob(base64Part)
      return true
    }
    // Check raw base64
    atob(data)
    return true
  } catch {
    return false
  }
}
