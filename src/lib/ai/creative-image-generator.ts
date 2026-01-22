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
import {
  BRAND_COLORS,
  IMAGE_STYLES,
  getBrandColorPrompt,
  type ImageStyleId,
} from '@/lib/config/brand'

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
// PROMPT DIVERSITY POOLS
// ============================================

// Helper function to randomly select from an array
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// LIFESTYLE POOLS - For Community Mode (Austin Local, Pop Culture, Seasonal)
const LIFESTYLE_POOLS = {
  austinScenes: [
    'bustling South Congress cafe patio with eclectic vintage decor',
    'cozy East Austin coffee shop with exposed brick and local art',
    'Rainey Street bar patio with string lights at golden hour',
    'vibrant food truck park at sunset with diverse crowd',
    'Lady Bird Lake hike and bike trail at golden hour',
    'intimate live music venue on 6th Street',
    'colorful local taco joint with vintage neon signs',
    'upscale Domain restaurant terrace with modern design',
    'Mueller farmers market on a sunny Sunday morning',
    'rooftop bar overlooking downtown Austin skyline at dusk',
    'Barton Springs Pool area on a summer afternoon',
    'historic Driskill Hotel bar with classic elegance',
    'trendy East Side King food trailer with late night crowd',
    'Zilker Park picnic scene with Austin skyline backdrop',
    'cozy Hyde Park neighborhood cafe with shaded patio',
  ],

  peopleActivities: [
    'friends laughing and clinking glasses over brunch',
    'skilled barista crafting intricate latte art',
    'passionate chef carefully plating a beautiful dish',
    'couple sharing appetizers and enjoying conversation',
    'solo diner savoring coffee while reading a book',
    'group of friends toasting at happy hour',
    'musicians tuning instruments before a show',
    'food truck owner proudly serving customers',
    'bartender expertly mixing a craft cocktail',
    'family enjoying weekend breakfast together',
    'coworkers having a casual outdoor meeting',
    'local artist sketching the scene around them',
  ],

  seasonalThemes: [
    'spring bluebonnets in Texas Hill Country',
    'summer patio dining with cold margaritas and sunshine',
    'fall football watch party with burnt orange everywhere',
    'holiday lights on 2nd Street District at night',
    'SXSW festival energy with creative crowds',
    'ACL Music Festival weekend vibes',
    'Fourth of July celebration with Austin skyline',
    'Halloween on 6th Street with creative costumes',
    'Thanksgiving gathering with Texas BBQ twist',
    'New Year countdown at downtown celebration',
  ],

  photographyMoods: [
    'warm golden hour glow casting long shadows',
    'moody evening ambiance with soft string lights',
    'bright and airy morning light streaming in',
    'dramatic sunset silhouettes against the sky',
    'intimate candlelit atmosphere with bokeh',
    'vibrant midday energy with saturated colors',
    'soft overcast light with even tones',
    'neon-lit night scene with urban energy',
  ],

  cameraAngles: [
    'wide establishing shot capturing the full scene',
    'intimate close-up focusing on details',
    'over-the-shoulder perspective drawing viewer in',
    'candid moment captured from across the room',
    'low angle making the scene feel grand',
    'high angle overview of the bustling space',
    'profile shot with beautiful background blur',
  ],
}

// SERVICE POOLS - For Promotional Mode (Before/After, Service Showcase)
const SERVICE_POOLS = {
  spaces: [
    'upscale steakhouse commercial kitchen with stainless steel surfaces',
    'boutique hotel commercial kitchen during off-hours',
    'craft brewery taproom after closing time',
    'modern corporate office break room and kitchen',
    'luxury hotel bathroom with marble finishes',
    'restaurant walk-in cooler with organized shelving',
    'food hall vendor prep area and service counter',
    'country club kitchen with professional equipment',
    'fine dining restaurant bar area',
    'hospital cafeteria kitchen with industrial equipment',
    'university dining hall serving area',
    'corporate headquarters executive kitchen',
  ],

  beforeDescriptors: [
    'heavy grease buildup on hood vents and filters',
    'grimy tile floors with visible stains and residue',
    'cluttered and disorganized storage shelves',
    'water stains and soap scum on fixtures',
    'dust accumulation on ceiling vents and returns',
    'sticky residue coating prep surfaces',
    'fingerprints and smudges covering stainless steel',
    'grime buildup in grout lines',
    'food debris accumulated in corners',
    'cloudy and streaked glass surfaces',
  ],

  afterDescriptors: [
    'sparkling stainless steel reflecting overhead lights',
    'gleaming floors with mirror-like shine',
    'perfectly organized and pristine storage areas',
    'spotless and sanitized surfaces ready for inspection',
    'crystal clear glass and polished mirrors',
    'fresh and move-in ready appearance',
    'bright white grout lines fully restored',
    'streak-free surfaces with professional finish',
    'immaculate condition meeting health code standards',
    'showroom-quality cleanliness throughout',
  ],

  equipment: [
    'commercial floor scrubber polishing tile',
    'professional steam cleaning system in action',
    'HEPA vacuum system on commercial carpet',
    'pressure washer cleaning exterior concrete',
    'detail brushes restoring grout lines',
    'microfiber mop system on hardwood',
    'commercial window cleaning equipment',
    'industrial degreaser application on hood',
    'carpet extraction machine deep cleaning',
    'sanitizing fogger treating surfaces',
  ],

  techniques: [
    'methodical deep cleaning process',
    'professional attention to detail work',
    'systematic sanitization protocol',
    'expert restoration technique',
    'thorough inspection and quality check',
    'precision cleaning in tight spaces',
    'eco-friendly cleaning approach',
    'high-touch surface disinfection',
  ],
}

// GRAPHIC POOLS - For branded graphics, quote cards, stat graphics
const GRAPHIC_POOLS = {
  layouts: [
    'bold headline with supporting imagery below',
    'centered text with elegant border treatment',
    'asymmetric modern layout with dynamic angles',
    'minimalist design with single focal point',
    'split composition with text and visual balance',
    'gradient background with floating elements',
    'clean grid-based professional layout',
  ],

  colorTreatments: [
    `rich olive green (${BRAND_COLORS.primary.olive}) gradient`,
    `lime accent (${BRAND_COLORS.primary.lime}) with dark contrast`,
    `warm yellow (${BRAND_COLORS.primary.yellow}) highlights on neutral`,
    'sophisticated dark mode with brand color accents',
    'light and airy with subtle brand color touches',
    'high contrast black and white with color pop',
    'earth tones with organic texture feel',
  ],

  visualStyles: [
    'modern corporate with clean lines',
    'organic and approachable with soft edges',
    'bold and confident with strong typography',
    'elegant and refined with premium feel',
    'friendly and warm with inviting presence',
    'professional and trustworthy appearance',
  ],
}

// Negative prompts to avoid stock-photo feel
const NEGATIVE_PROMPTS = [
  'NO stock photo feel',
  'NO overly posed or artificial scenes',
  'NO generic corporate imagery',
  'NO watermarks or text overlays',
  'NO clipart or cartoon style',
  'NOT everyone looking at camera',
  'NO matching identical outfits',
  'NO obviously AI-generated artifacts',
]

// ============================================
// DYNAMIC PROMPT BUILDERS
// ============================================

function buildLifestylePrompt(
  style: string,
  topic?: string,
  customHint?: string
): string {
  const scene = randomFrom(LIFESTYLE_POOLS.austinScenes)
  const activity = randomFrom(LIFESTYLE_POOLS.peopleActivities)
  const mood = randomFrom(LIFESTYLE_POOLS.photographyMoods)
  const angle = randomFrom(LIFESTYLE_POOLS.cameraAngles)
  const negatives = NEGATIVE_PROMPTS.slice(0, 3).join(', ')

  const topicContext = topic ? `Theme: ${topic}. ` : ''
  const customContext = customHint ? `${customHint} ` : ''

  switch (style) {
    case 'lifestyle':
      return `${mood} photography. ${angle} of ${scene}. ${activity}. ${topicContext}${customContext}Authentic Austin, Texas vibe, editorial magazine quality. Warm and inviting atmosphere. ${negatives}. NO text, NO logos, NO promotional graphics.`

    case 'minimal':
      return `Clean, minimalist editorial photography. ${mood}. ${topicContext}${customContext}Sophisticated composition with plenty of negative space. Focus on textures and light. Modern, artistic, magazine-quality. ${negatives}. NO text overlays, NO graphics - pure visual storytelling.`

    case 'behindScenes':
      return `Documentary-style candid photography. ${angle} capturing ${activity}. ${topicContext}${customContext}Real, authentic moments in ${scene}. Natural and unposed. Warm, genuine atmosphere. ${negatives}. NO staged shots, NO text.`

    case 'seasonal':
      const seasonal = randomFrom(LIFESTYLE_POOLS.seasonalThemes)
      return `${mood} photography capturing ${seasonal}. ${topicContext}${customContext}Festive but sophisticated. Beautiful natural lighting at ${scene}. Editorial quality. ${negatives}. NO promotional text, NO sale graphics.`

    case 'artistic':
      return `Creative artistic photography. ${mood}. ${topicContext}${customContext}Eye-catching, unique composition. Bold colors or interesting patterns in ${scene}. Modern art photography style. Abstract elements welcome. ${negatives}. NO text, NO logos.`

    default:
      return `Beautiful lifestyle photography. ${mood} at ${scene}. ${activity}. ${topicContext}${customContext}Authentic, editorial quality. ${negatives}. NO promotional graphics, NO text overlays.`
  }
}

function buildServicePrompt(imageType: ImageType, serviceContext?: string): string {
  const space = randomFrom(SERVICE_POOLS.spaces)
  const before = randomFrom(SERVICE_POOLS.beforeDescriptors)
  const after = randomFrom(SERVICE_POOLS.afterDescriptors)
  const equipment = randomFrom(SERVICE_POOLS.equipment)
  const technique = randomFrom(SERVICE_POOLS.techniques)
  const negatives = NEGATIVE_PROMPTS.slice(0, 2).join(', ')

  const contextHint = serviceContext
    ? SERVICE_CONTEXTS[serviceContext] || `featuring ${serviceContext}`
    : ''

  switch (imageType) {
    case 'before_after':
      return `Professional commercial cleaning transformation, dramatic split-screen comparison. LEFT SIDE: ${space} showing ${before}, needs attention. RIGHT SIDE: Same exact space now ${after}, professionally cleaned. Editorial photography quality, high detail, realistic commercial setting. ${contextHint} ${negatives}.`

    case 'service_showcase':
      return `Professional commercial cleaning in action. ${equipment} being used with ${technique} in ${space}. ${after} results visible. Magazine editorial quality photography, natural lighting, focus on expertise and quality results. ${contextHint} ${negatives}.`

    case 'promotional':
      const layout = randomFrom(GRAPHIC_POOLS.layouts)
      const colorStyle = randomFrom(GRAPHIC_POOLS.colorTreatments)
      const visualStyle = randomFrom(GRAPHIC_POOLS.visualStyles)
      return `Eye-catching promotional banner for commercial cleaning services. ${layout} design. ${colorStyle} color scheme. ${visualStyle} aesthetic. Modern corporate design, bold but professional typography, clean visual hierarchy. Call-to-action focused layout, marketing material quality. ${BRAND_COLOR_PROMPT}`

    default:
      return `Professional commercial cleaning scene. ${space} with ${after}. High quality, realistic commercial photography. ${negatives}.`
  }
}

function buildGraphicPrompt(imageType: ImageType): string {
  const layout = randomFrom(GRAPHIC_POOLS.layouts)
  const colorStyle = randomFrom(GRAPHIC_POOLS.colorTreatments)
  const visualStyle = randomFrom(GRAPHIC_POOLS.visualStyles)

  switch (imageType) {
    case 'quote_card':
      return `Elegant testimonial quote card design. ${layout}. ${colorStyle} background treatment. ${visualStyle}. Sophisticated typography space with large quotation marks. Minimalist, social media optimized. Clean and modern aesthetic. ${BRAND_COLOR_PROMPT}`

    case 'stat_graphic':
      return `Modern data visualization infographic design. ${layout}. ${colorStyle} accents. ${visualStyle}. Space for large numbers or simple charts. Business presentation quality, clear visual hierarchy, easy to read metrics. ${BRAND_COLOR_PROMPT}`

    case 'branded_graphic':
      return `Modern minimalist marketing graphic design. ${layout}. ${colorStyle}. ${visualStyle}. Elegant typography treatment. Professional business layout, perfect for social media, clean lines, premium feel. ${BRAND_COLOR_PROMPT}`

    default:
      return `Professional marketing graphic. ${layout}. ${colorStyle}. ${visualStyle}. ${BRAND_COLOR_PROMPT}`
  }
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
  imageStyle?: ImageStyleId // New: lifestyle, minimal, behindScenes, etc.
  platform?: string // instagram, linkedin, facebook - for dimension hints
  topic?: string // Topic context for more relevant images
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

// Urban Simple brand color palette for prompts
const BRAND_COLOR_PROMPT = `Brand colors: olive green (${BRAND_COLORS.primary.olive}), lime accent (${BRAND_COLORS.primary.lime}), yellow highlight (${BRAND_COLORS.primary.yellow}), charcoal (${BRAND_COLORS.neutral.charcoal}), off-white (${BRAND_COLORS.neutral.lightGray}).`

const IMAGE_PROMPTS: Record<ImageType, string> = {
  before_after: `Professional commercial cleaning transformation, split-screen comparison showing dramatic before and after results. Left side shows a dirty, grimy commercial kitchen with grease buildup and messy floors. Right side shows the same space sparkling clean, organized, and sanitized. Professional lighting, editorial photography quality, high detail, realistic commercial setting.`,

  branded_graphic: `Modern minimalist marketing graphic design with elegant typography. Corporate clean aesthetic with sophisticated gradient using olive green (${BRAND_COLORS.primary.olive}) and lime (${BRAND_COLORS.primary.lime}) accents. Professional business layout, perfect for social media, clean lines, premium feel. ${BRAND_COLOR_PROMPT}`,

  team_photo: `Professional commercial cleaning team at work in a high-end restaurant setting. Workers wearing clean matching uniforms, using professional equipment. Friendly, competent demeanor. Natural lighting, corporate photography style, diversity in team composition. Focus on professionalism and attention to detail.`,

  promotional: `Eye-catching promotional banner for commercial cleaning services. Modern corporate design, bold but professional typography, clean visual hierarchy. Brand colors: olive green, lime accents, yellow highlights on light background. Call-to-action focused layout, marketing material quality. ${BRAND_COLOR_PROMPT}`,

  service_showcase: `Professional commercial cleaning service in action at an upscale restaurant or hotel. Worker using professional-grade equipment, demonstrating expertise and care. Sparkling clean results visible. Magazine editorial quality photography, natural lighting, focus on quality and attention to detail.`,

  quote_card: `Elegant testimonial quote card design with sophisticated typography. Minimalist layout with large quotation marks. Soft gradient background using olive green (${BRAND_COLORS.primary.olive}) tones. Professional business graphics style, social media optimized, clean and modern aesthetic.`,

  stat_graphic: `Modern data visualization infographic for business statistics. Clean corporate design with charts or large numbers. Professional color scheme using olive green (${BRAND_COLORS.primary.olive}), lime (${BRAND_COLORS.primary.lime}), and charcoal (${BRAND_COLORS.neutral.charcoal}) accents. Business presentation quality, clear visual hierarchy, easy to read metrics.`,
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

  // Check if this is a community/lifestyle style (NOT promotional)
  const styleConfig = params.imageStyle ? IMAGE_STYLES[params.imageStyle] : null
  const isCommunityStyle = styleConfig?.notAd === true

  // For community/lifestyle content, use a completely different prompt approach
  // NO promotional graphics, NO text overlays, NO CTAs - just beautiful photos
  let fullPrompt: string

  if (isCommunityStyle) {
    // COMMUNITY MODE: Generate lifestyle photography using dynamic prompt builder
    // Each generation will use randomly selected elements for variety
    let stylePrompt = ''

    // Handle quote and data styles separately (they need backgrounds, not lifestyle photos)
    if (params.imageStyle === 'quote') {
      stylePrompt = buildGraphicPrompt('quote_card')
    } else if (params.imageStyle === 'data') {
      stylePrompt = buildGraphicPrompt('stat_graphic')
    } else {
      // Use the dynamic lifestyle prompt builder for variety
      stylePrompt = buildLifestylePrompt(
        params.imageStyle || 'lifestyle',
        params.topic,
        params.customPrompt
      )
    }

    // Platform-specific adjustments
    if (params.platform === 'instagram') {
      stylePrompt += ' Square 1:1 composition optimized for Instagram feed. Eye-catching, scroll-stopping visual.'
    } else if (params.platform === 'linkedin') {
      stylePrompt += ' Professional yet warm. Landscape composition.'
    }

    fullPrompt = stylePrompt + ' High resolution, 8K quality photography.'
  } else {
    // PROMOTIONAL MODE: Use dynamic prompt builders for variety
    let basePrompt: string

    // Use appropriate dynamic builder based on image type
    if (
      params.imageType === 'before_after' ||
      params.imageType === 'service_showcase' ||
      params.imageType === 'promotional'
    ) {
      // Service-related images use SERVICE_POOLS
      basePrompt = buildServicePrompt(params.imageType, params.serviceContext)
    } else if (
      params.imageType === 'quote_card' ||
      params.imageType === 'stat_graphic' ||
      params.imageType === 'branded_graphic'
    ) {
      // Graphics use GRAPHIC_POOLS
      basePrompt = buildGraphicPrompt(params.imageType)
    } else if (params.imageType === 'team_photo') {
      // DEPRECATED: team_photo - fallback to generic professional scene
      // Use real photos instead of AI-generated team images
      console.warn('team_photo is deprecated - consider using real team photos instead')
      basePrompt = `Professional commercial space, clean and well-maintained. Modern business environment with attention to detail. Editorial photography quality. NO people - focus on the space and results.`
    } else {
      // Fallback to static prompts for any unhandled types
      basePrompt = IMAGE_PROMPTS[params.imageType]
    }

    const customization = params.customPrompt ? ` ${params.customPrompt}` : ''
    const styleGuide =
      params.style === 'illustration'
        ? ' Digital illustration style, vector art quality.'
        : params.style === 'graphic'
          ? ' Professional graphic design, clean vector elements.'
          : ' Photorealistic, high resolution, 8K quality.'

    const topicContext = params.topic ? ` Topic/theme: ${params.topic}.` : ''

    let dimensionHint = ''
    if (params.platform === 'instagram') {
      dimensionHint = ' Square 1:1 format optimized for Instagram feed.'
    } else if (params.platform === 'linkedin') {
      dimensionHint = ' Landscape 1.91:1 format optimized for LinkedIn.'
    }

    fullPrompt = `${basePrompt}${customization}${styleGuide}${topicContext}${dimensionHint}`
  }

  console.log('Generating image...')
  console.log('Community mode:', isCommunityStyle)
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

  // With the new dynamic prompt system, each call to generateCreativeImage
  // will automatically produce varied results due to random pool selection.
  // We no longer need to add manual variation hints - the variety is built in!

  for (let i = 0; i < count; i++) {
    // Each generation uses fresh random selections from the pools
    const result = await generateCreativeImage(params)
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
  aspectRatio: AspectRatio,
  platform?: string
): { width: number; height: number } {
  // Instagram-specific dimensions (1080x1080 for feed)
  if (platform === 'instagram') {
    switch (aspectRatio) {
      case '1:1':
        return { width: 1080, height: 1080 }
      case '9:16':
        return { width: 1080, height: 1920 } // Stories
      case '4:3':
        return { width: 1080, height: 810 }
      default:
        return { width: 1080, height: 1080 } // Default to square for Instagram
    }
  }

  // LinkedIn dimensions
  if (platform === 'linkedin') {
    return aspectRatio === '1:1'
      ? { width: 1080, height: 1080 }
      : { width: 1200, height: 627 }
  }

  // Facebook dimensions
  if (platform === 'facebook') {
    return aspectRatio === '1:1'
      ? { width: 1080, height: 1080 }
      : { width: 1200, height: 630 }
  }

  // Default dimensions
  switch (aspectRatio) {
    case '1:1':
      return { width: 1080, height: 1080 }
    case '4:3':
      return { width: 1024, height: 768 }
    case '16:9':
      return { width: 1280, height: 720 }
    case '9:16':
      return { width: 1080, height: 1920 }
    case '3:4':
      return { width: 810, height: 1080 }
    default:
      return { width: 1080, height: 1080 }
  }
}

// Helper to get the correct aspect ratio for a platform
export function getDefaultAspectRatioForPlatform(platform: string): AspectRatio {
  switch (platform) {
    case 'instagram':
      return '1:1' // Square for Instagram feed
    case 'linkedin':
      return '16:9' // Landscape for LinkedIn
    case 'facebook':
      return '16:9' // Landscape for Facebook
    case 'twitter':
      return '16:9'
    default:
      return '1:1'
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
