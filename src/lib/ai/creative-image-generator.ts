/**
 * Creative Hub - AI Image Generator
 *
 * Generates marketing images for B2B commercial cleaning services:
 * - Before/after transformations
 * - Branded graphics (quote cards, stat graphics)
 * - Professional team imagery
 * - Promotional banners
 *
 * Uses Gemini 3 Pro Image (Nano Banana Pro) - Google's best image generation model
 * Fallback chain: Gemini 3 Pro Image → Imagen 4 → Imagen 3 → Curated stock images
 */

import { GoogleGenAI } from '@google/genai'

// Model hierarchy (best to fallback)
const IMAGE_MODELS = {
  GEMINI_3_PRO: 'gemini-3-pro-image-preview', // Nano Banana Pro - best quality, up to 4K
  IMAGEN_4: 'imagen-4.0-generate-001', // Imagen 4 GA
  IMAGEN_3: 'imagen-3.0-generate-002', // Imagen 3 fallback
} as const

// Lazy initialization of Gemini client
let genAI: GoogleGenAI | null = null

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const apiKey =
      process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
    genAI = new GoogleGenAI({ apiKey })
  }
  return genAI
}

// ============================================
// TYPES
// ============================================

export type ImageType =
  | 'before_after'
  | 'branded_graphic'
  | 'team_photo'
  | 'promotional'
  | 'service_showcase'
  | 'quote_card'
  | 'stat_graphic'

export type AspectRatio = '1:1' | '4:3' | '16:9' | '9:16' | '3:4'

export interface ImageGenerationParams {
  imageType: ImageType
  aspectRatio: AspectRatio
  customPrompt?: string
  serviceContext?: string
  brandColors?: boolean
  style?: 'photorealistic' | 'graphic' | 'illustration'
}

export interface GeneratedImage {
  imageBase64: string
  prompt: string
  model: string
  aspectRatio: AspectRatio
}

// ============================================
// IMAGE PROMPT TEMPLATES
// ============================================

const IMAGE_PROMPTS: Record<ImageType, string> = {
  before_after: `Professional commercial cleaning transformation, split-screen comparison showing dramatic before and after results. Left side shows a dirty, grimy commercial kitchen with grease buildup and messy floors. Right side shows the same space sparkling clean, organized, and sanitized. Professional lighting, editorial photography quality, high detail, realistic commercial setting.`,

  branded_graphic: `Modern minimalist marketing graphic design with elegant typography. Corporate clean aesthetic with sophisticated gradient background using ocean blue (#0284c7) and warm bronze (#A67C52) accents on cream background. Professional business layout, perfect for social media, clean lines, premium feel.`,

  team_photo: `Professional commercial cleaning team at work in a high-end restaurant setting. Workers wearing clean matching uniforms, using professional equipment. Friendly, competent demeanor. Natural lighting, corporate photography style, diversity in team composition. Focus on professionalism and attention to detail.`,

  promotional: `Eye-catching promotional banner for commercial cleaning services. Modern corporate design, bold but professional typography, clean visual hierarchy. Urban Simple brand colors (ocean blue, bronze accents, cream background). Call-to-action focused layout, marketing material quality.`,

  service_showcase: `Professional commercial cleaning service in action at an upscale restaurant or hotel. Worker using professional-grade equipment, demonstrating expertise and care. Sparkling clean results visible. Magazine editorial quality photography, natural lighting, focus on quality and attention to detail.`,

  quote_card: `Elegant testimonial quote card design with sophisticated typography. Minimalist layout with large quotation marks. Soft gradient background in ocean blue tones. Professional business graphics style, social media optimized, clean and modern aesthetic.`,

  stat_graphic: `Modern data visualization infographic for business statistics. Clean corporate design with charts or large numbers. Professional color scheme using ocean blue (#0284c7), bronze (#A67C52), and charcoal accents. Business presentation quality, clear visual hierarchy, easy to read metrics.`,
}

// ============================================
// SERVICE-SPECIFIC CONTEXT
// ============================================

const SERVICE_CONTEXTS: Record<string, string> = {
  kitchen_cleaning: `commercial restaurant kitchen, stainless steel equipment, hood vents, industrial ovens, commercial dishwasher area`,
  restaurant_deep_clean: `upscale restaurant dining room, booth seating, bar area, elegant ambiance, hospitality setting`,
  hotel_housekeeping: `luxury hotel room, crisp white linens, modern bathroom, guest amenities, hospitality excellence`,
  office_cleaning: `modern corporate office, workstations, conference room, reception area, professional environment`,
  post_construction: `newly renovated commercial space, construction debris cleared, move-in ready, pristine finishes`,
  floor_care: `polished commercial floors, gleaming surfaces, high-traffic areas, professional floor maintenance`,
  general: `modern commercial space, professional cleaning environment, business setting`,
}

// ============================================
// IMAGE GENERATION
// ============================================

export async function generateCreativeImage(
  params: ImageGenerationParams
): Promise<GeneratedImage | null> {
  const ai = getGenAI()

  // Build the full prompt
  const basePrompt = IMAGE_PROMPTS[params.imageType]
  const serviceContext = params.serviceContext
    ? SERVICE_CONTEXTS[params.serviceContext] ||
      `featuring ${params.serviceContext}`
    : ''
  const customization = params.customPrompt ? `, ${params.customPrompt}` : ''
  const styleGuide =
    params.style === 'illustration'
      ? ', digital illustration style, vector art quality'
      : params.style === 'graphic'
        ? ', professional graphic design, clean vector elements'
        : ', photorealistic, high resolution, 8K quality'

  const fullPrompt = `${basePrompt}${serviceContext ? `, ${serviceContext}` : ''}${customization}${styleGuide}. Professional commercial photography or design quality.`

  console.log('Generating image with Gemini 3 Pro Image (Nano Banana Pro)...')
  console.log('Prompt:', fullPrompt.substring(0, 200) + '...')

  // Try Gemini 3 Pro Image first (Nano Banana Pro - best quality)
  try {
    console.log(`Trying ${IMAGE_MODELS.GEMINI_3_PRO}...`)
    const response = await ai.models.generateContent({
      model: IMAGE_MODELS.GEMINI_3_PRO,
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
        responseModalities: ['image', 'text'],
      },
    })

    // Check for image in response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      const anyPart = part as { inlineData?: { data: string; mimeType: string } }
      if (anyPart.inlineData?.data) {
        console.log('Successfully generated image with Gemini 3 Pro Image')
        return {
          imageBase64: anyPart.inlineData.data,
          prompt: fullPrompt,
          model: IMAGE_MODELS.GEMINI_3_PRO,
          aspectRatio: params.aspectRatio,
        }
      }
    }
    throw new Error('No image in Gemini 3 Pro response')
  } catch (error) {
    console.error('Gemini 3 Pro Image failed:', error)
  }

  // Fallback to Imagen 4
  try {
    console.log(`Trying ${IMAGE_MODELS.IMAGEN_4}...`)
    const response = await ai.models.generateImages({
      model: IMAGE_MODELS.IMAGEN_4,
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: params.aspectRatio,
      },
    })

    const generatedImage = response.generatedImages?.[0]
    if (generatedImage?.image?.imageBytes) {
      console.log('Successfully generated image with Imagen 4')
      return {
        imageBase64: generatedImage.image.imageBytes,
        prompt: fullPrompt,
        model: IMAGE_MODELS.IMAGEN_4,
        aspectRatio: params.aspectRatio,
      }
    }
    throw new Error('No image data in Imagen 4 response')
  } catch (error) {
    console.error('Imagen 4 generation failed:', error)
  }

  // Fallback to Imagen 3
  try {
    console.log(`Trying ${IMAGE_MODELS.IMAGEN_3}...`)
    const response = await ai.models.generateImages({
      model: IMAGE_MODELS.IMAGEN_3,
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: params.aspectRatio,
      },
    })

    const generatedImage = response.generatedImages?.[0]
    if (generatedImage?.image?.imageBytes) {
      console.log('Successfully generated image with Imagen 3')
      return {
        imageBase64: generatedImage.image.imageBytes,
        prompt: fullPrompt,
        model: IMAGE_MODELS.IMAGEN_3,
        aspectRatio: params.aspectRatio,
      }
    }
    throw new Error('No image data in Imagen 3 response')
  } catch (error) {
    console.error('Imagen 3 generation failed:', error)
  }

  console.error('All image generation models failed')
  return null
}

// ============================================
// BATCH GENERATION
// ============================================

export async function generateImageVariations(
  params: ImageGenerationParams,
  count: number = 4
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = []

  // Generate multiple images with slight prompt variations
  const variations = [
    '', // Original
    ', different angle',
    ', alternative composition',
    ', closer perspective',
  ]

  for (let i = 0; i < Math.min(count, variations.length); i++) {
    const variantParams = {
      ...params,
      customPrompt: `${params.customPrompt || ''}${variations[i]}`,
    }

    const result = await generateCreativeImage(variantParams)
    if (result) {
      results.push(result)
    }

    // Small delay between requests to avoid rate limiting
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}

// ============================================
// CURATED FALLBACK IMAGES
// ============================================

// Fallback to curated Unsplash images if AI generation fails
const CURATED_IMAGES: Record<ImageType, string[]> = {
  before_after: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=1200&h=800&fit=crop',
  ],
  branded_graphic: [
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop',
  ],
  team_photo: [
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=800&fit=crop',
  ],
  promotional: [
    'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=800&fit=crop',
  ],
  service_showcase: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=1200&h=800&fit=crop',
  ],
  quote_card: [
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=800&fit=crop',
  ],
  stat_graphic: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop',
  ],
}

export function getFallbackImage(imageType: ImageType): string {
  const images = CURATED_IMAGES[imageType] || CURATED_IMAGES.promotional
  return images[Math.floor(Math.random() * images.length)]
}

// ============================================
// HELPERS
// ============================================

export function getAspectRatioDimensions(
  aspectRatio: AspectRatio
): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1024, height: 1024 }
    case '4:3':
      return { width: 1024, height: 768 }
    case '16:9':
      return { width: 1280, height: 720 }
    case '9:16':
      return { width: 720, height: 1280 }
    case '3:4':
      return { width: 768, height: 1024 }
    default:
      return { width: 1024, height: 1024 }
  }
}

export function base64ToDataUrl(
  base64: string,
  mimeType: string = 'image/png'
): string {
  return `data:${mimeType};base64,${base64}`
}

export function isValidBase64Image(data: string): boolean {
  try {
    // Check if it's a valid base64 string
    const decoded = atob(data)
    return decoded.length > 0
  } catch {
    return false
  }
}
