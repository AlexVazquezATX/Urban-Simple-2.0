/**
 * Urban Simple Brand Configuration
 *
 * Central source of truth for brand colors, fonts, and visual identity
 * Used by AI image generation, content creation, and UI components
 */

export const BRAND_COLORS = {
  // Primary palette
  primary: {
    olive: '#849f3d',      // Primary brand green
    lime: '#bede20',       // Accent lime/chartreuse
    yellow: '#f9ec31',     // Bright yellow accent
  },

  // Neutrals
  neutral: {
    charcoal: '#282827',   // Primary dark/text
    gray: '#5a5a5a',       // Mid-dark gray
    lightGray: '#f1f1f2',  // Light background
    white: '#ffffff',
  },

  // For AI prompts - descriptive names
  descriptive: {
    primary: 'olive green (#849f3d)',
    accent: 'bright lime green (#bede20)',
    highlight: 'vibrant yellow (#f9ec31)',
    dark: 'charcoal black (#282827)',
    light: 'soft off-white (#f1f1f2)',
  },
} as const

export const BRAND_FONTS = {
  heading: 'modern sans-serif',
  body: 'clean sans-serif',
}

export const BRAND_VOICE = {
  personality: [
    'Professional but approachable',
    'Austin-local and community-focused',
    'Confident without being salesy',
    'Helpful and knowledgeable',
  ],
  avoid: [
    'Corporate jargon',
    'Aggressive sales tactics',
    'Generic stock photo aesthetics',
    'Cheesy cleaning puns (unless intentionally funny)',
  ],
}

// Image style options for content creation
export const IMAGE_STYLES = {
  lifestyle: {
    id: 'lifestyle',
    name: 'Lifestyle / Community',
    description: 'Authentic Austin scenes, local restaurants, real moments',
    promptHint: 'authentic photography style, natural lighting, real Austin Texas locations, candid moments, warm and inviting atmosphere',
    notAd: true,
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal / Editorial',
    description: 'Clean typography, magazine-quality, sophisticated',
    promptHint: 'minimalist design, clean composition, editorial photography style, sophisticated, plenty of white space, modern typography',
    notAd: true,
  },
  behindScenes: {
    id: 'behindScenes',
    name: 'Behind the Scenes',
    description: 'Real work moments, team culture, authentic action',
    promptHint: 'documentary style photography, real working moments, authentic action shots, genuine team culture, natural and unposed',
    notAd: true,
  },
  quote: {
    id: 'quote',
    name: 'Quote / Typography',
    description: 'Text-focused, inspirational, clean backgrounds',
    promptHint: 'typography-focused design, inspirational quote layout, clean solid background, modern font styling, minimal graphic elements',
    notAd: true,
  },
  data: {
    id: 'data',
    name: 'Stats / Infographic',
    description: 'Data visualization, facts, educational',
    promptHint: 'infographic style, data visualization, clean charts and numbers, educational layout, modern graphic design',
    notAd: true,
  },
  branded: {
    id: 'branded',
    name: 'Branded Promotional',
    description: 'When you actually want an ad with logo and CTA',
    promptHint: 'professional marketing graphic, branded promotional material, clear call-to-action, company logo placement, polished advertising aesthetic',
    notAd: false,
  },
  artistic: {
    id: 'artistic',
    name: 'Artistic / Abstract',
    description: 'Creative, eye-catching, pattern-based',
    promptHint: 'artistic abstract design, creative visual composition, eye-catching patterns, bold graphic elements, unique artistic interpretation',
    notAd: true,
  },
  seasonal: {
    id: 'seasonal',
    name: 'Seasonal / Holiday',
    description: 'Themed for specific holidays or seasons',
    promptHint: 'seasonal themed design, holiday-appropriate imagery, festive but professional, timely and relevant visual elements',
    notAd: true,
  },
} as const

export type ImageStyleId = keyof typeof IMAGE_STYLES

// Platform-specific image dimensions
export const PLATFORM_DIMENSIONS = {
  instagram: {
    feed: { width: 1080, height: 1080, aspect: '1:1' },
    story: { width: 1080, height: 1920, aspect: '9:16' },
    landscape: { width: 1080, height: 566, aspect: '1.91:1' },
  },
  linkedin: {
    feed: { width: 1200, height: 627, aspect: '1.91:1' },
    square: { width: 1080, height: 1080, aspect: '1:1' },
  },
  facebook: {
    feed: { width: 1200, height: 630, aspect: '1.91:1' },
    square: { width: 1080, height: 1080, aspect: '1:1' },
  },
  twitter: {
    feed: { width: 1200, height: 675, aspect: '16:9' },
    square: { width: 1080, height: 1080, aspect: '1:1' },
  },
} as const

// Helper to get brand color prompt for AI image generation
export function getBrandColorPrompt(): string {
  return `Brand colors to incorporate subtly: olive green (${BRAND_COLORS.primary.olive}), lime accent (${BRAND_COLORS.primary.lime}), yellow highlight (${BRAND_COLORS.primary.yellow}). Use charcoal (${BRAND_COLORS.neutral.charcoal}) for text/dark elements. These should be accent colors, not overwhelming the entire image.`
}

// Helper to get full image generation context
export function getImageGenerationContext(
  style: ImageStyleId,
  platform: string,
  topic?: string
): string {
  const styleConfig = IMAGE_STYLES[style]
  const brandColors = getBrandColorPrompt()

  let dimensions = 'square 1:1 aspect ratio'
  if (platform === 'instagram') {
    dimensions = '1080x1080 square format for Instagram feed'
  } else if (platform === 'linkedin') {
    dimensions = '1200x627 landscape format for LinkedIn'
  } else if (platform === 'facebook') {
    dimensions = '1200x630 landscape format for Facebook'
  }

  return `
Style: ${styleConfig.name} - ${styleConfig.promptHint}
${brandColors}
Format: ${dimensions}
${topic ? `Topic context: ${topic}` : ''}
${styleConfig.notAd ? 'IMPORTANT: This should NOT look like a typical advertisement or stock marketing graphic. Make it feel authentic, editorial, and unique.' : ''}
`.trim()
}
