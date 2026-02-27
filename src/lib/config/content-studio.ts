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

export type AspectRatio = '1:1' | '4:5' | '5:4' | '9:16' | '16:9' | '3:4' | '4:3' | '2:3' | '3:2' | '21:9'

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
  { value: '3:2', label: '3:2', hint: 'Classic photo, landscape' },
  { value: '2:3', label: '2:3', hint: 'Tall portrait, posters' },
  { value: '21:9', label: '21:9', hint: 'Ultrawide, cinematic' },
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
// REFERENCE IMAGE MODES
// ============================================

export type ReferenceMode = 'style' | 'layout' | 'palette' | 'mood'

export interface ReferenceModeConfig {
  id: ReferenceMode
  label: string
  description: string
  promptInstruction: string
}

export const REFERENCE_MODES: ReferenceModeConfig[] = [
  {
    id: 'style',
    label: 'Style',
    description: 'Match the visual style (watercolor, anime, CGI, photo, etc.)',
    promptInstruction:
      'Analyze the VISUAL STYLE of the reference image(s) — identify the rendering technique (e.g. watercolor, anime, photorealistic, CGI, oil painting, vector illustration, pencil sketch) and apply that exact same style to the generated image. Match the line work, texture quality, shading approach, and level of detail.',
  },
  {
    id: 'layout',
    label: 'Layout',
    description: 'Match the scene composition, setting, and camera angle',
    promptInstruction:
      'Replicate the LAYOUT and COMPOSITION of the reference image(s) — match the camera angle, perspective, spatial arrangement of elements, foreground/background relationship, and overall scene structure. The setting and environment should closely mirror the reference.',
  },
  {
    id: 'palette',
    label: 'Color Palette',
    description: 'Extract and apply the color scheme',
    promptInstruction:
      'Extract the COLOR PALETTE from the reference image(s) and apply it to the generated image. Match the dominant colors, accent colors, color temperature (warm/cool), saturation levels, and overall tonal range. The final image should feel like it belongs to the same color world.',
  },
  {
    id: 'mood',
    label: 'Mood',
    description: 'Match the lighting, atmosphere, and emotional tone',
    promptInstruction:
      'Capture the MOOD and ATMOSPHERE of the reference image(s) — match the lighting direction, intensity, and quality (soft/harsh/dramatic), the emotional tone (energetic, calm, moody, luxurious), and the overall atmospheric feeling (hazy, crisp, dreamy, gritty).',
  },
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
  /** Pre-analyzed description of reference images (from Step 1 vision analysis) */
  referenceAnalysis?: string | null
}

/**
 * Build the final prompt sent to the AI model.
 *
 * Philosophy: the user's prompt is sacred. We only append optional
 * context — never wrap it in prescriptive instructions.
 *
 * Reference images are handled via a two-step approach:
 * - Step 1 (before this): Gemini analyzes reference images → text description
 * - Step 2 (here): That text description is injected as concrete style instructions
 */
export function buildPrompt(params: PromptAssemblyParams): string {
  const {
    prompt,
    stylePreset,
    brandContext,
    applyBrandContext = true,
    brandAssetCount = 0,
    referenceAnalysis,
  } = params

  const parts: string[] = [prompt.trim()]

  // Reference image analysis — concrete style/mood/palette descriptions
  // This is the key: instead of passing images and hoping, we pass
  // a detailed text description that the generation model WILL follow.
  if (referenceAnalysis) {
    parts.push(
      `MANDATORY STYLE INSTRUCTIONS (extracted from reference images — you MUST follow these precisely):\n${referenceAnalysis}\nThe generated image MUST match these visual qualities exactly. Do NOT default to photorealistic if the style analysis describes a different rendering technique.`
    )
  }

  // Style preset modifier (skip for 'custom' or when not set)
  // Skip if reference analysis already provides style direction
  if (stylePreset && stylePreset !== 'custom' && !referenceAnalysis) {
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

  // Brand asset instructions (these are still sent as inline images)
  if (brandAssetCount > 0) {
    const assets = Array.from({ length: brandAssetCount }, (_, i) => `Image ${i + 1}`)
    parts.push(
      `BRAND ASSET INSTRUCTIONS:\n${assets.join(', ')}: Brand asset(s) — incorporate the EXACT object, product, or item from these images into the generated image. The item should be prominently featured and match the reference precisely.`
    )
  }

  return parts.join('\n\n')
}
