/**
 * Restaurant Creative Studio Configuration
 *
 * Output formats, prompts, and constants for food photography
 * and branded content generation for restaurant clients.
 */

// ============================================
// OUTPUT FORMATS FOR FOOD PHOTOGRAPHY
// ============================================

export type OutputFormatId = 'menu' | 'uber_eats' | 'social_instagram' | 'social_story'

export interface OutputFormat {
  id: OutputFormatId
  title: string
  description: string
  aspectRatio: '1:1' | '4:3' | '16:9' | '9:16' | '4:5'
  promptModifier: string
  icon: string // Lucide icon name
}

export const OUTPUT_FORMATS: Record<OutputFormatId, OutputFormat> = {
  menu: {
    id: 'menu',
    title: 'Menu Ready',
    description: 'Clean, professional menu photography',
    aspectRatio: '4:3',
    promptModifier:
      'Professional menu photography style. Clean white or marble background, centered hero shot composition, soft diffused studio lighting from above-left. No props or distractions - focus entirely on the dish. High-end restaurant menu quality, appetizing, clean lines.',
    icon: 'BookOpen',
  },
  uber_eats: {
    id: 'uber_eats',
    title: 'Delivery Apps',
    description: 'Optimized for Uber Eats, DoorDash',
    aspectRatio: '1:1',
    promptModifier:
      'Food delivery app optimized photography. Bright, vibrant, saturated colors that pop on mobile screens. Appetizing 45-degree hero angle, warm lighting. Makes food look irresistible and craveable. Square format, optimized for small thumbnail viewing. Eye-catching even at small sizes.',
    icon: 'Truck',
  },
  social_instagram: {
    id: 'social_instagram',
    title: 'Instagram Feed',
    description: 'Scroll-stopping social content',
    aspectRatio: '1:1',
    promptModifier:
      'Instagram food photography aesthetic. Lifestyle setting with beautiful props and surfaces. Natural window light or golden hour glow. Modern plating, food blogger style. Trending food aesthetic - aspirational, shareable, scroll-stopping. Warm, inviting tones.',
    icon: 'Instagram',
  },
  social_story: {
    id: 'social_story',
    title: 'Stories & Reels',
    description: 'Vertical format for Stories',
    aspectRatio: '9:16',
    promptModifier:
      'Vertical social story format. Dramatic close-up composition capturing texture and detail. Moody, atmospheric lighting with depth. Engaging vertical composition that captures attention in the first second. Dynamic angles, steam or motion if appropriate.',
    icon: 'Smartphone',
  },
}

export const OUTPUT_FORMAT_LIST = Object.values(OUTPUT_FORMATS)

// ============================================
// BRANDED POST TYPES
// ============================================

export type BrandedPostType =
  | 'announcement'
  | 'promo'
  | 'quote'
  | 'event'
  | 'menu_feature'

export interface BrandedPostConfig {
  id: BrandedPostType
  title: string
  description: string
  layoutStyle: string
  promptModifier: string
  icon: string
}

export const BRANDED_POST_TYPES: Record<BrandedPostType, BrandedPostConfig> = {
  announcement: {
    id: 'announcement',
    title: 'Announcement',
    description: 'New items, hours, or updates',
    layoutStyle: 'Bold headline with supporting imagery',
    promptModifier:
      'Modern announcement graphic design. Bold, clear typography as focal point. Clean layout with strong visual hierarchy. Professional but inviting. Restaurant branding colors.',
    icon: 'Megaphone',
  },
  promo: {
    id: 'promo',
    title: 'Promotion',
    description: 'Deals, discounts, special offers',
    layoutStyle: 'Eye-catching with urgency',
    promptModifier:
      'Promotional graphic with urgency. Eye-catching design, bold colors. Clear call-to-action. Deal or discount prominently displayed. Creates excitement and FOMO.',
    icon: 'BadgePercent',
  },
  quote: {
    id: 'quote',
    title: 'Testimonial',
    description: 'Customer or chef quotes',
    layoutStyle: 'Typography-focused, elegant',
    promptModifier:
      'Elegant testimonial quote card design. Sophisticated typography with large quotation marks. Subtle gradient or texture background. Trust-building, premium feel. Restaurant brand colors.',
    icon: 'Quote',
  },
  event: {
    id: 'event',
    title: 'Event',
    description: 'Live music, happy hours, special nights',
    layoutStyle: 'Date prominent, energetic',
    promptModifier:
      'Event announcement graphic. Date and time prominently displayed. Energetic, inviting design. Creates excitement and anticipation. Festive but on-brand.',
    icon: 'Calendar',
  },
  menu_feature: {
    id: 'menu_feature',
    title: 'Menu Feature',
    description: 'Highlight a signature dish',
    layoutStyle: 'Food hero with description',
    promptModifier:
      'Menu feature promotional graphic. Beautiful food photography as hero element. Dish name and description elegantly integrated. Appetizing, makes viewer want to order. Premium restaurant marketing style.',
    icon: 'UtensilsCrossed',
  },
}

export const BRANDED_POST_TYPE_LIST = Object.values(BRANDED_POST_TYPES)

// ============================================
// CUISINE TYPES
// ============================================

export const CUISINE_TYPES = [
  { value: 'american', label: 'American' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'italian', label: 'Italian' },
  { value: 'asian', label: 'Asian Fusion' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'indian', label: 'Indian' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'steakhouse', label: 'Steakhouse' },
  { value: 'bbq', label: 'BBQ' },
  { value: 'cafe', label: 'Cafe & Bakery' },
  { value: 'bar', label: 'Bar & Grill' },
  { value: 'fast_casual', label: 'Fast Casual' },
  { value: 'fine_dining', label: 'Fine Dining' },
  { value: 'other', label: 'Other' },
] as const

// ============================================
// STYLE PREFERENCES
// ============================================

export const STYLE_PREFERENCES = [
  {
    value: 'minimal',
    label: 'Minimal & Clean',
    description: 'White space, simple, modern',
  },
  {
    value: 'vibrant',
    label: 'Vibrant & Bold',
    description: 'Colorful, energetic, eye-catching',
  },
  {
    value: 'rustic',
    label: 'Rustic & Warm',
    description: 'Earthy, cozy, farmhouse feel',
  },
  {
    value: 'elegant',
    label: 'Elegant & Refined',
    description: 'Sophisticated, upscale, premium',
  },
  {
    value: 'playful',
    label: 'Playful & Fun',
    description: 'Casual, friendly, approachable',
  },
] as const

// ============================================
// FOOD PHOTOGRAPHY PROMPT TEMPLATES
// ============================================

export function buildFoodPhotoPrompt(params: {
  dishDescription?: string
  outputFormat: OutputFormatId
  cuisineType?: string
  style?: string
}): string {
  const { dishDescription, outputFormat, cuisineType, style } = params
  const formatConfig = OUTPUT_FORMATS[outputFormat]

  const cuisineContext = cuisineType
    ? `This is ${cuisineType} cuisine. `
    : ''

  const styleContext = style
    ? `Style preference: ${style}. `
    : ''

  return `You are a world-class food photographer. Transform this amateur dish photo into stunning professional food photography.

CRITICAL INSTRUCTIONS:
- This is the EXACT dish from the reference image - maintain its identity precisely
- Do NOT change the dish, ingredients, or plating arrangement
- ONLY enhance: lighting, angle, background, styling, and visual quality
- Make it look like it was shot by a professional food photographer

${cuisineContext}${styleContext}

OUTPUT STYLE: ${formatConfig.promptModifier}

${dishDescription ? `Dish description: ${dishDescription}` : ''}

QUALITY REQUIREMENTS:
- Professional food magazine quality
- Appetizing and irresistible
- Perfect focus and exposure
- High resolution, 8K quality
- Photorealistic - must look like a real photograph, not AI-generated artwork`
}

export function buildBrandedPostPrompt(params: {
  postType: BrandedPostType
  headline?: string
  restaurantName?: string
  primaryColor?: string
  secondaryColor?: string
  style?: string
}): string {
  const {
    postType,
    headline,
    restaurantName,
    primaryColor,
    secondaryColor,
    style,
  } = params
  const postConfig = BRANDED_POST_TYPES[postType]

  const brandColors =
    primaryColor || secondaryColor
      ? `Brand colors: ${primaryColor || ''}${secondaryColor ? `, ${secondaryColor}` : ''}. `
      : ''

  return `Create a professional restaurant marketing graphic.

TYPE: ${postConfig.title}
LAYOUT: ${postConfig.layoutStyle}

${postConfig.promptModifier}

${restaurantName ? `Restaurant: ${restaurantName}` : ''}
${headline ? `Headline/Text: "${headline}"` : ''}
${brandColors}
${style ? `Style preference: ${style}` : ''}

REQUIREMENTS:
- Modern, professional design
- Clear visual hierarchy
- Social media optimized
- Visually appealing and on-brand
- High quality, sharp graphics`
}

// ============================================
// GENERATION MODES
// ============================================

export const GENERATION_MODES = {
  food_photo: {
    id: 'food_photo',
    title: 'Food Photography',
    description: 'Transform your dish photos into professional images',
    icon: 'Camera',
    gradient: 'from-amber-500 to-orange-500',
  },
  branded_post: {
    id: 'branded_post',
    title: 'Branded Posts',
    description: 'Create promotional graphics with your brand',
    icon: 'Sparkles',
    gradient: 'from-purple-500 to-pink-500',
  },
} as const

export type GenerationMode = keyof typeof GENERATION_MODES
