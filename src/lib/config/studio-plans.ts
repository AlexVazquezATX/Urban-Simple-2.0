/**
 * Creative Studio Plan Feature Gates
 *
 * Central config for what each plan tier can access.
 * Generation limits are in PLAN_CONFIGS (studio-admin-service.ts).
 * This file handles feature-level gating.
 */

import { StudioPlanTier } from '@prisma/client'

// ============================================
// FEATURE ACCESS PER PLAN
// ============================================

export interface PlanFeatures {
  /** Max brand kits the user can create (0 = none) */
  maxBrandKits: number
  /** Can access all photography styles (false = only 'minimal' and 'menu' format) */
  allStyles: boolean
  /** Can use branded post generator */
  brandedPosts: boolean
  /** Can use custom/freeform branded post type */
  customPosts: boolean
  /** Can use smart prompt buttons (Phase 4) */
  smartPrompts: boolean
  /** Display name for the plan */
  displayName: string
  /** Max brand assets (-1 = unlimited) */
  maxBrandAssets: number
  /** Can upload reference images for generation */
  referenceImages: boolean
  /** Can access all style presets in Content Studio */
  allStylePresets: boolean
}

export const PLAN_FEATURES: Record<StudioPlanTier, PlanFeatures> = {
  TRIAL: {
    maxBrandKits: 1,
    allStyles: true,
    brandedPosts: true,
    customPosts: false,
    smartPrompts: true,
    displayName: 'Free',
    maxBrandAssets: 5,
    referenceImages: false,
    allStylePresets: false,
  },
  STARTER: {
    maxBrandKits: 1,
    allStyles: true,
    brandedPosts: true,
    customPosts: false,
    smartPrompts: true,
    displayName: 'Starter',
    maxBrandAssets: 20,
    referenceImages: true,
    allStylePresets: true,
  },
  PROFESSIONAL: {
    maxBrandKits: 3,
    allStyles: true,
    brandedPosts: true,
    customPosts: true,
    smartPrompts: true,
    displayName: 'Pro',
    maxBrandAssets: 50,
    referenceImages: true,
    allStylePresets: true,
  },
  ENTERPRISE: {
    maxBrandKits: -1, // unlimited
    allStyles: true,
    brandedPosts: true,
    customPosts: true,
    smartPrompts: true,
    displayName: 'Max',
    maxBrandAssets: -1, // unlimited
    referenceImages: true,
    allStylePresets: true,
  },
}

// Styles available on the free tier
export const FREE_STYLES = ['minimal'] as const
export const FREE_OUTPUT_FORMATS = ['menu', 'social_instagram'] as const

/**
 * Get feature access for a plan tier
 */
export function getFeatureAccess(planTier: StudioPlanTier): PlanFeatures {
  return PLAN_FEATURES[planTier]
}

/**
 * Check if a specific style is allowed for a plan tier
 */
export function isStyleAllowed(planTier: StudioPlanTier, style: string): boolean {
  const features = PLAN_FEATURES[planTier]
  if (features.allStyles) return true
  return (FREE_STYLES as readonly string[]).includes(style)
}

/**
 * Check if a specific output format is allowed for a plan tier
 */
export function isOutputFormatAllowed(planTier: StudioPlanTier, format: string): boolean {
  const features = PLAN_FEATURES[planTier]
  if (features.allStyles) return true
  return (FREE_OUTPUT_FORMATS as readonly string[]).includes(format)
}

/**
 * Check if the user can create another brand kit
 */
export function canCreateBrandKit(planTier: StudioPlanTier, currentCount: number): boolean {
  const features = PLAN_FEATURES[planTier]
  if (features.maxBrandKits === -1) return true // unlimited
  return currentCount < features.maxBrandKits
}

// ============================================
// PRICING PAGE DATA
// ============================================

export interface PlanPricing {
  tier: StudioPlanTier
  displayName: string
  price: number
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
}

export const PLAN_PRICING: PlanPricing[] = [
  {
    tier: 'TRIAL' as StudioPlanTier,
    displayName: 'Free',
    price: 0,
    description: 'Experience the full Creative Studio',
    features: [
      '10 generations total',
      'Freeform prompt — any style',
      'Product + Custom presets',
      '5 brand assets',
      '1 brand kit',
    ],
    cta: 'Get Started Free',
  },
  {
    tier: 'STARTER' as StudioPlanTier,
    displayName: 'Starter',
    price: 29,
    description: 'For restaurants getting started with AI content',
    features: [
      '100 generations per month',
      'All style presets',
      'Reference images',
      '20 brand assets',
      '1 brand kit',
    ],
    cta: 'Start Starter Plan',
  },
  {
    tier: 'PROFESSIONAL' as StudioPlanTier,
    displayName: 'Pro',
    price: 59,
    description: 'For busy restaurants and small chains',
    features: [
      '300 generations per month',
      'All style presets',
      'Reference images',
      '50 brand assets',
      '3 brand kits',
    ],
    cta: 'Start Pro Plan',
    highlighted: true,
  },
  {
    tier: 'ENTERPRISE' as StudioPlanTier,
    displayName: 'Max',
    price: 99,
    description: 'For busy restaurants and small chains',
    features: [
      '1,000 generations per month',
      'All style presets',
      'Reference images',
      'Unlimited brand assets',
      'Unlimited brand kits',
      'Priority support',
    ],
    cta: 'Start Max Plan',
  },
]
