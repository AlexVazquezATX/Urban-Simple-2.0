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
  /** Can export platform-ready formats (Phase 4) */
  platformExports: boolean
  /** Can use smart prompt buttons (Phase 4) */
  smartPrompts: boolean
  /** Display name for the plan */
  displayName: string
}

export const PLAN_FEATURES: Record<StudioPlanTier, PlanFeatures> = {
  TRIAL: {
    maxBrandKits: 0,
    allStyles: false,
    brandedPosts: false,
    platformExports: false,
    smartPrompts: false,
    displayName: 'Free',
  },
  STARTER: {
    maxBrandKits: 1,
    allStyles: true,
    brandedPosts: true,
    platformExports: false,
    smartPrompts: true,
    displayName: 'Starter',
  },
  PROFESSIONAL: {
    maxBrandKits: 3,
    allStyles: true,
    brandedPosts: true,
    platformExports: true,
    smartPrompts: true,
    displayName: 'Pro',
  },
  ENTERPRISE: {
    maxBrandKits: -1, // unlimited
    allStyles: true,
    brandedPosts: true,
    platformExports: true,
    smartPrompts: true,
    displayName: 'Enterprise',
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
    description: 'Try Creative Studio with limited features',
    features: [
      '10 generations per month',
      'Minimal style only',
      'Menu & Instagram formats',
    ],
    cta: 'Get Started Free',
  },
  {
    tier: 'STARTER' as StudioPlanTier,
    displayName: 'Starter',
    price: 29,
    description: 'For restaurants getting started with AI content',
    features: [
      '50 generations per month',
      'All photography styles',
      'Branded post generator',
      '1 brand kit',
      'Smart prompts',
    ],
    cta: 'Start Starter Plan',
  },
  {
    tier: 'PROFESSIONAL' as StudioPlanTier,
    displayName: 'Pro',
    price: 79,
    description: 'For busy restaurants and small chains',
    features: [
      '200 generations per month',
      'All photography styles',
      'Branded post generator',
      '3 brand kits',
      'Platform-ready exports',
      'Smart prompts',
    ],
    cta: 'Start Pro Plan',
    highlighted: true,
  },
  {
    tier: 'ENTERPRISE' as StudioPlanTier,
    displayName: 'Enterprise',
    price: 199,
    description: 'For restaurant groups and agencies',
    features: [
      'Unlimited generations',
      'All photography styles',
      'Branded post generator',
      'Unlimited brand kits',
      'Platform-ready exports',
      'Smart prompts',
      'Priority support',
    ],
    cta: 'Start Enterprise Plan',
  },
]
