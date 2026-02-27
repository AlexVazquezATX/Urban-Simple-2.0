/**
 * Content Studio - Unified AI Image Generator
 *
 * Single generation pipeline for all content types.
 * Supports freeform prompts, brand assets, and reference images.
 *
 * Reference images use a two-step approach:
 * 1. Analyze reference images with Gemini (text-only) to extract style descriptions
 * 2. Inject those descriptions into the generation prompt as concrete text
 *
 * This is necessary because Gemini's image generation mode does not reliably
 * use input images as style/composition references.
 */

import { GoogleGenAI } from '@google/genai'
import {
  buildPrompt,
  REFERENCE_MODES,
  type StylePreset,
  type AspectRatio,
  type ReferenceMode,
} from '@/lib/config/content-studio'

// Model hierarchy: 3.1 Flash (fast + refined) → 3.0 Pro (fallback)
const IMAGE_MODELS = {
  GEMINI_31_FLASH: 'gemini-3.1-flash-image-preview',
  GEMINI_3_PRO: 'gemini-3-pro-image-preview',
} as const

// Text model for analyzing reference images
const ANALYSIS_MODEL = 'gemini-2.5-flash'

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
  referenceModes?: ReferenceMode[] // What to extract from reference images
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
// REFERENCE IMAGE ANALYSIS (Step 1)
// ============================================

/**
 * Analyze reference images and extract a detailed text description
 * of their visual properties, based on selected modes.
 *
 * This converts visual references → concrete text that the image
 * generation model can actually follow.
 */
async function analyzeReferenceImages(
  ai: GoogleGenAI,
  referenceImageBase64s: string[],
  referenceModes: ReferenceMode[]
): Promise<string | null> {
  if (referenceImageBase64s.length === 0) return null

  // Build analysis prompt based on selected modes (or all if none selected)
  const activeModes =
    referenceModes.length > 0
      ? referenceModes
      : (['style', 'mood', 'palette'] as ReferenceMode[])

  const analysisQuestions = activeModes
    .map((modeId) => {
      const mode = REFERENCE_MODES.find((m) => m.id === modeId)
      if (!mode) return null
      switch (modeId) {
        case 'style':
          return 'VISUAL STYLE: What is the rendering technique? (e.g. watercolor, ink illustration, anime, CGI, oil painting, vector art, pencil sketch, photorealistic, collage, etc.) Describe the line work, texture quality, shading approach, and level of detail. Be extremely specific.'
        case 'layout':
          return 'COMPOSITION & LAYOUT: Describe the camera angle, perspective, spatial arrangement, foreground/background relationship, and overall scene structure.'
        case 'palette':
          return 'COLOR PALETTE: List the exact dominant colors, accent colors, color temperature (warm/cool), saturation levels. Example: "muted earth tones — burnt sienna, dusty olive, warm cream — with pops of deep teal".'
        case 'mood':
          return 'MOOD & ATMOSPHERE: Describe the lighting direction/quality/intensity, emotional tone, and atmospheric feeling (hazy, crisp, dreamy, gritty, etc.).'
        default:
          return null
      }
    })
    .filter(Boolean)

  const analysisPrompt = `You are an expert visual analyst. Study the attached reference image(s) carefully and provide a detailed description that could be used to recreate the same visual qualities in a new image.

Analyze the following aspects:
${analysisQuestions.join('\n')}

IMPORTANT: Be extremely specific and concrete. Use precise technical terms. Do NOT be vague. The output will be used as instructions for an image generation model.

Respond in a single paragraph per aspect, labeled clearly. Keep each paragraph to 2-3 sentences of dense, specific description.`

  type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
  const parts: Part[] = []

  // Add images first
  for (const refBase64 of referenceImageBase64s) {
    const parsed = parseBase64Image(refBase64)
    if (parsed) {
      parts.push({ inlineData: parsed })
    }
  }

  parts.push({ text: analysisPrompt })

  try {
    console.log('[Content Studio] Analyzing reference images...')

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: [{ role: 'user', parts }],
    })

    const text = response.candidates?.[0]?.content?.parts?.[0]
    const textContent = text && 'text' in text ? (text as { text: string }).text : null

    if (textContent) {
      console.log('[Content Studio] Reference analysis:', textContent.slice(0, 200) + '...')
      return textContent
    }

    console.warn('[Content Studio] No text response from reference analysis')
    return null
  } catch (error) {
    console.error('[Content Studio] Reference analysis failed:', error)
    return null
  }
}

// ============================================
// UNIFIED IMAGE GENERATION (Step 2)
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
    referenceModes = [],
    brandContext,
    applyBrandContext = true,
  } = params

  // Step 1: Analyze reference images (if any) to get concrete style descriptions
  let referenceAnalysis: string | null = null
  if (referenceImageBase64s.length > 0) {
    referenceAnalysis = await analyzeReferenceImages(ai, referenceImageBase64s, referenceModes)
  }

  // Step 2: Assemble the final prompt with the reference analysis baked in
  const assembledPrompt = buildPrompt({
    prompt: userPrompt,
    stylePreset,
    brandContext,
    applyBrandContext,
    brandAssetCount: brandAssetUrls.length,
    referenceAnalysis,
  })

  console.log('[Content Studio] Generating image...', {
    stylePreset: stylePreset || 'none',
    aspectRatio,
    brandAssets: brandAssetUrls.length,
    referenceImages: referenceImageBase64s.length,
    hasReferenceAnalysis: !!referenceAnalysis,
    promptLength: assembledPrompt.length,
  })

  // Build content parts — only brand assets as inline images (reference style is now text)
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
  const parts: Part[] = []

  // Brand assets as inline images (these need visual matching)
  let assetCount = 0
  for (const assetUrl of brandAssetUrls) {
    const fetched = await fetchImageAsBase64(assetUrl)
    if (fetched) {
      parts.push({ inlineData: fetched })
      assetCount++
    }
  }

  // Text prompt (includes the reference analysis as concrete text)
  parts.push({ text: assembledPrompt })

  console.log('[Content Studio] Generation parts:', {
    brandAssets: assetCount,
    textLength: assembledPrompt.length,
    totalParts: parts.length,
  })

  // Shared config — native aspect ratio + resolution via imageConfig
  const sharedConfig = {
    responseModalities: ['IMAGE', 'TEXT'] as const,
    imageConfig: {
      aspectRatio,
      imageSize: '1K' as const,
    },
  }

  // Models to try in order
  const models = [
    { id: IMAGE_MODELS.GEMINI_31_FLASH, label: 'Gemini 3.1 Flash' },
    { id: IMAGE_MODELS.GEMINI_3_PRO, label: 'Gemini 3.0 Pro' },
  ]

  for (const model of models) {
    try {
      console.log(`[Content Studio] Trying ${model.label} (${model.id})...`)

      const response = await ai.models.generateContent({
        model: model.id,
        contents: [{ role: 'user', parts }],
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
