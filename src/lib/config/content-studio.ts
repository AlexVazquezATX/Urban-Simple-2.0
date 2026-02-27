/**
 * Content Studio Configuration
 *
 * Unified config for freeform content generation.
 * Style presets, aspect ratios, and prompt assembly.
 */

// ============================================
// STYLE PRESETS
// ============================================

export type StylePreset = 'product' | 'lifestyle' | 'social_media' | 'editorial' | 'custom'

export interface StylePresetConfig {
  id: StylePreset
  title: string
  description: string
  icon: string // Lucide icon name
  promptModifier: string // Appended when selected; empty for 'custom'
}

export const STYLE_PRESETS: Record<StylePreset, StylePresetConfig> = {
  product: {
    id: 'product',
    title: 'Product Shot',
    description: 'Clean background, hero lighting, product focus',
    icon: 'Package',
    promptModifier:
      'Professional product photography. Clean background, studio lighting, focus on the subject. High-end commercial quality.',
  },
  lifestyle: {
    id: 'lifestyle',
    title: 'Lifestyle',
    description: 'Natural setting, warm tones, in-context',
    icon: 'Sun',
    promptModifier:
      'Lifestyle photography. Natural setting, warm ambient light, the subject integrated into an aspirational real-world context.',
  },
  social_media: {
    id: 'social_media',
    title: 'Social Media',
    description: 'Eye-catching, scroll-stopping, vibrant',
    icon: 'Share2',
    promptModifier:
      'Social media optimized. Vibrant colors, eye-catching composition, modern aesthetic. Scroll-stopping visual impact.',
  },
  editorial: {
    id: 'editorial',
    title: 'Editorial',
    description: 'Magazine quality, artistic, dramatic',
    icon: 'BookOpen',
    promptModifier:
      'Editorial photography. Magazine-quality, dramatic lighting, artistic composition. High fashion or fine dining aesthetic.',
  },
  custom: {
    id: 'custom',
    title: 'Custom / Prompt Only',
    description: 'Your prompt is the only instruction',
    icon: 'Pencil',
    promptModifier: '',
  },
}

export const STYLE_PRESET_LIST = Object.values(STYLE_PRESETS)

// ============================================
// ASPECT RATIOS
// ============================================

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '3:4'

export interface AspectRatioConfig {
  value: AspectRatio
  label: string
  hint: string
}

export const ASPECT_RATIOS: AspectRatioConfig[] = [
  { value: '1:1', label: '1:1', hint: 'Feed posts, thumbnails' },
  { value: '4:5', label: '4:5', hint: 'Instagram optimal' },
  { value: '9:16', label: '9:16', hint: 'Stories, Reels, TikTok' },
  { value: '16:9', label: '16:9', hint: 'YouTube, headers' },
  { value: '3:4', label: '3:4', hint: 'Pinterest, portraits' },
]

// ============================================
// BRAND ASSET CATEGORIES
// ============================================

export type BrandAssetCategory = 'logo' | 'product' | 'crew' | 'apparel' | 'object' | 'general'

export interface BrandAssetCategoryConfig {
  id: BrandAssetCategory
  label: string
  description: string
}

export const BRAND_ASSET_CATEGORIES: BrandAssetCategoryConfig[] = [
  { id: 'logo', label: 'Logos', description: 'Brand logos and marks' },
  { id: 'product', label: 'Products', description: 'Food, drinks, menu items' },
  { id: 'crew', label: 'Crew', description: 'Team and staff photos' },
  { id: 'apparel', label: 'Apparel', description: 'T-shirts, uniforms, merch' },
  { id: 'object', label: 'Objects', description: 'Glassware, signage, decor' },
  { id: 'general', label: 'General', description: 'Other brand imagery' },
]

// ============================================
// PROMPT ASSEMBLY
// ============================================

export interface PromptAssemblyParams {
  prompt: string
  stylePreset?: StylePreset | null
  brandContext?: {
    restaurantName?: string
    primaryColor?: string
    secondaryColor?: string
  } | null
  applyBrandContext?: boolean
  brandAssetCount?: number
  referenceImageCount?: number
}

/**
 * Build the final prompt sent to the AI model.
 *
 * Philosophy: the user's prompt is sacred. We only append optional
 * context — never wrap it in prescriptive instructions.
 */
export function buildPrompt(params: PromptAssemblyParams): string {
  const {
    prompt,
    stylePreset,
    brandContext,
    applyBrandContext = true,
    brandAssetCount = 0,
    referenceImageCount = 0,
  } = params

  const parts: string[] = [prompt.trim()]

  // Style preset modifier (skip for 'custom' or when not set)
  if (stylePreset && stylePreset !== 'custom') {
    const preset = STYLE_PRESETS[stylePreset]
    if (preset?.promptModifier) {
      parts.push(preset.promptModifier)
    }
  }

  // Brand context (restaurant identity)
  if (applyBrandContext && brandContext) {
    const contextParts: string[] = []
    if (brandContext.restaurantName) {
      contextParts.push(`Brand: ${brandContext.restaurantName}`)
    }
    if (brandContext.primaryColor) {
      contextParts.push(`Primary color: ${brandContext.primaryColor}`)
    }
    if (brandContext.secondaryColor) {
      contextParts.push(`Secondary color: ${brandContext.secondaryColor}`)
    }
    if (contextParts.length > 0) {
      parts.push(`Brand identity: ${contextParts.join('. ')}.`)
    }
  }

  // Image reference instructions (only if images are being sent)
  const hasImages = brandAssetCount > 0 || referenceImageCount > 0
  if (hasImages) {
    const instructions: string[] = []
    let imageIndex = 1

    if (referenceImageCount > 0) {
      const refs = Array.from({ length: referenceImageCount }, () => `Image ${imageIndex++}`)
      instructions.push(
        `${refs.join(', ')}: Style/scene reference(s) — use these for composition, lighting, mood, and aesthetic inspiration.`
      )
    }

    if (brandAssetCount > 0) {
      const assets = Array.from({ length: brandAssetCount }, () => `Image ${imageIndex++}`)
      instructions.push(
        `${assets.join(', ')}: Brand asset(s) — incorporate the EXACT object, product, or item from these images into the generated image. The item should be prominently featured and match the reference precisely.`
      )
    }

    parts.push(
      `REFERENCE IMAGE INSTRUCTIONS:\n${instructions.join('\n')}\n\nCombine the style/mood from any scene references with the exact appearance from the brand assets to create a cohesive image.`
    )
  }

  return parts.join('\n\n')
}
