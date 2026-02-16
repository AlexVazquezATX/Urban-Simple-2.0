/**
 * Studio Admin Service
 *
 * Manages Creative Studio client subscriptions, usage tracking, and admin operations.
 */

import { prisma } from '@/lib/db'
import { StudioPlanTier } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export interface StudioClientSummary {
  id: string
  companyId: string
  companyName: string
  restaurantName?: string
  planTier: StudioPlanTier
  status: string
  generationsUsed: number
  generationsLimit: number
  usagePercent: number
  isComplementary: boolean
  lastActivity?: Date
  createdAt: Date
}

export interface StudioClientDetail extends StudioClientSummary {
  email?: string
  phone?: string
  stripeCustomerId?: string
  monthlyRate?: number
  trialEndsAt?: Date
  onboardedAt?: Date
  usageHistory: {
    date: string
    count: number
  }[]
  recentContent: {
    id: string
    mode: string
    generatedImageUrl?: string
    createdAt: Date
  }[]
}

export interface CreateStudioClientInput {
  companyName: string
  email?: string
  phone?: string
  planTier?: StudioPlanTier
  monthlyGenerationsLimit?: number
  onboardedBy?: string
  isComplementary?: boolean
}

export interface UpdateStudioClientInput {
  planTier?: StudioPlanTier
  monthlyGenerationsLimit?: number
  status?: string
  monthlyRate?: number
  isComplementary?: boolean
}

// Plan tier configurations
export const PLAN_CONFIGS: Record<StudioPlanTier, { limit: number; rate: number; name: string }> = {
  TRIAL: { limit: 10, rate: 0, name: 'Free' },
  STARTER: { limit: 50, rate: 29, name: 'Starter' },
  PROFESSIONAL: { limit: 200, rate: 59, name: 'Pro' },
  ENTERPRISE: { limit: 1000, rate: 99, name: 'Max' },
}

// ============================================
// CLIENT MANAGEMENT
// ============================================

/**
 * Get all studio clients with summary data
 */
export async function getStudioClients(options?: {
  status?: string
  planTier?: StudioPlanTier
  search?: string
  limit?: number
  offset?: number
}): Promise<{ clients: StudioClientSummary[]; total: number }> {
  const { status, planTier, search, limit = 50, offset = 0 } = options || {}

  // Build where clause for subscriptions
  const subscriptionWhere: Record<string, unknown> = {}
  if (status) subscriptionWhere.status = status
  if (planTier) subscriptionWhere.planTier = planTier

  // Get subscriptions with company data
  const [subscriptions, total] = await Promise.all([
    prisma.studioSubscription.findMany({
      where: subscriptionWhere,
      include: {
        usageLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.studioSubscription.count({ where: subscriptionWhere }),
  ])

  // Get company and brand kit data for each subscription
  const clientsWithNulls = await Promise.all(
    subscriptions.map(async (sub) => {
      const [company, brandKit] = await Promise.all([
        prisma.company.findUnique({
          where: { id: sub.companyId },
          select: { id: true, name: true, email: true },
        }),
        prisma.restaurantBrandKit.findFirst({
          where: { companyId: sub.companyId, isDefault: true },
          select: { restaurantName: true },
        }),
      ])

      // Filter by search if provided
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesSearch =
          company?.name.toLowerCase().includes(searchLower) ||
          brandKit?.restaurantName?.toLowerCase().includes(searchLower) ||
          company?.email?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return null
      }

      const usagePercent = sub.monthlyGenerationsLimit > 0
        ? Math.round((sub.generationsUsedThisMonth / sub.monthlyGenerationsLimit) * 100)
        : 0

      return {
        id: sub.id,
        companyId: sub.companyId,
        companyName: company?.name || 'Unknown',
        restaurantName: brandKit?.restaurantName,
        planTier: sub.planTier,
        status: sub.status,
        generationsUsed: sub.generationsUsedThisMonth,
        generationsLimit: sub.monthlyGenerationsLimit,
        usagePercent,
        isComplementary: sub.isComplementary,
        lastActivity: sub.usageLogs[0]?.createdAt,
        createdAt: sub.createdAt,
      }
    })
  )

  // Filter out null results from search
  const clients = clientsWithNulls.filter((c) => c !== null) as StudioClientSummary[]

  return { clients, total: search ? clients.length : total }
}

/**
 * Get detailed info for a single studio client
 */
export async function getStudioClientDetail(subscriptionId: string): Promise<StudioClientDetail | null> {
  const subscription = await prisma.studioSubscription.findUnique({
    where: { id: subscriptionId },
  })

  if (!subscription) return null

  const [company, brandKit, usageLogs, recentContent] = await Promise.all([
    prisma.company.findUnique({
      where: { id: subscription.companyId },
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.restaurantBrandKit.findFirst({
      where: { companyId: subscription.companyId, isDefault: true },
      select: { restaurantName: true },
    }),
    prisma.studioUsageLog.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.restaurantStudioContent.findMany({
      where: { companyId: subscription.companyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        mode: true,
        generatedImageUrl: true,
        createdAt: true,
      },
    }).then(content => content.map(c => ({
      ...c,
      generatedImageUrl: c.generatedImageUrl || undefined,
    }))),
  ])

  // Aggregate usage by day for chart
  const usageByDay = new Map<string, number>()
  usageLogs.forEach((log) => {
    const date = log.createdAt.toISOString().split('T')[0]
    usageByDay.set(date, (usageByDay.get(date) || 0) + log.creditsUsed)
  })

  const usageHistory = Array.from(usageByDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const usagePercent = subscription.monthlyGenerationsLimit > 0
    ? Math.round((subscription.generationsUsedThisMonth / subscription.monthlyGenerationsLimit) * 100)
    : 0

  return {
    id: subscription.id,
    companyId: subscription.companyId,
    companyName: company?.name || 'Unknown',
    restaurantName: brandKit?.restaurantName,
    email: company?.email || undefined,
    phone: company?.phone || undefined,
    planTier: subscription.planTier,
    status: subscription.status,
    generationsUsed: subscription.generationsUsedThisMonth,
    generationsLimit: subscription.monthlyGenerationsLimit,
    usagePercent,
    isComplementary: subscription.isComplementary,
    stripeCustomerId: subscription.stripeCustomerId || undefined,
    monthlyRate: subscription.monthlyRate ? Number(subscription.monthlyRate) : undefined,
    trialEndsAt: subscription.trialEndsAt || undefined,
    onboardedAt: subscription.onboardedAt || undefined,
    lastActivity: usageLogs[0]?.createdAt,
    createdAt: subscription.createdAt,
    usageHistory,
    recentContent,
  }
}

/**
 * Create a new studio client (company + subscription)
 */
export async function createStudioClient(input: CreateStudioClientInput): Promise<StudioClientSummary> {
  const { companyName, email, phone, planTier: inputPlanTier = 'TRIAL', monthlyGenerationsLimit, onboardedBy, isComplementary = false } = input

  // If complementary, force Pro tier settings
  const effectivePlanTier = isComplementary ? 'PROFESSIONAL' as StudioPlanTier : inputPlanTier
  const planConfig = PLAN_CONFIGS[effectivePlanTier]
  const limit = monthlyGenerationsLimit ?? planConfig.limit

  // Create company and subscription in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create company
    const company = await tx.company.create({
      data: {
        name: companyName,
        email,
        phone,
      },
    })

    // Create subscription
    const subscription = await tx.studioSubscription.create({
      data: {
        companyId: company.id,
        planTier: effectivePlanTier,
        planName: planConfig.name,
        monthlyGenerationsLimit: limit,
        monthlyRate: isComplementary ? 0 : planConfig.rate,
        status: 'active',
        isComplementary,
        onboardedAt: new Date(),
        onboardedBy,
      },
    })

    return { company, subscription }
  })

  return {
    id: result.subscription.id,
    companyId: result.company.id,
    companyName: result.company.name,
    planTier: result.subscription.planTier,
    status: result.subscription.status,
    generationsUsed: 0,
    generationsLimit: limit,
    usagePercent: 0,
    isComplementary: result.subscription.isComplementary,
    createdAt: result.subscription.createdAt,
  }
}

/**
 * Update a studio client's subscription
 */
export async function updateStudioClient(
  subscriptionId: string,
  input: UpdateStudioClientInput
): Promise<StudioClientSummary | null> {
  const subscription = await prisma.studioSubscription.findUnique({
    where: { id: subscriptionId },
  })

  if (!subscription) return null

  const updatedSubscription = await prisma.studioSubscription.update({
    where: { id: subscriptionId },
    data: {
      planTier: input.planTier,
      monthlyGenerationsLimit: input.monthlyGenerationsLimit,
      status: input.status,
      monthlyRate: input.monthlyRate,
      isComplementary: input.isComplementary,
      planName: input.planTier ? PLAN_CONFIGS[input.planTier].name : undefined,
    },
  })

  const company = await prisma.company.findUnique({
    where: { id: updatedSubscription.companyId },
    select: { name: true },
  })

  const usagePercent = updatedSubscription.monthlyGenerationsLimit > 0
    ? Math.round((updatedSubscription.generationsUsedThisMonth / updatedSubscription.monthlyGenerationsLimit) * 100)
    : 0

  return {
    id: updatedSubscription.id,
    companyId: updatedSubscription.companyId,
    companyName: company?.name || 'Unknown',
    planTier: updatedSubscription.planTier,
    status: updatedSubscription.status,
    generationsUsed: updatedSubscription.generationsUsedThisMonth,
    generationsLimit: updatedSubscription.monthlyGenerationsLimit,
    usagePercent,
    isComplementary: updatedSubscription.isComplementary,
    createdAt: updatedSubscription.createdAt,
  }
}

// ============================================
// USAGE TRACKING
// ============================================

/**
 * Get or create subscription for a company
 */
export async function getOrCreateSubscription(companyId: string) {
  let subscription = await prisma.studioSubscription.findUnique({
    where: { companyId },
  })

  if (!subscription) {
    subscription = await prisma.studioSubscription.create({
      data: {
        companyId,
        planTier: 'TRIAL',
        planName: PLAN_CONFIGS.TRIAL.name,
        monthlyGenerationsLimit: PLAN_CONFIGS.TRIAL.limit,
      },
    })
  }

  return subscription
}

/**
 * Check if a company can generate (has remaining credits)
 */
export async function canGenerate(companyId: string): Promise<{
  allowed: boolean
  reason?: string
  planTier?: StudioPlanTier
  generationsUsed?: number
  generationsLimit?: number
}> {
  const subscription = await getOrCreateSubscription(companyId)

  const base = {
    planTier: subscription.planTier,
    generationsUsed: subscription.generationsUsedThisMonth,
    generationsLimit: subscription.monthlyGenerationsLimit,
  }

  // Check if subscription is active
  if (subscription.status !== 'active') {
    return { allowed: false, reason: 'Your Creative Studio subscription is currently paused. Please contact support to reactivate.', ...base }
  }

  // Check usage limit
  if (subscription.generationsUsedThisMonth >= subscription.monthlyGenerationsLimit) {
    const reason = subscription.planTier === 'TRIAL'
      ? `You've used all ${subscription.monthlyGenerationsLimit} free generations. Upgrade your plan to keep creating.`
      : `You've used all ${subscription.monthlyGenerationsLimit} generations for this month. Upgrade your plan for more.`
    return { allowed: false, reason, ...base }
  }

  return { allowed: true, ...base }
}

/**
 * Log a generation and increment usage counter
 */
export async function logGeneration(params: {
  companyId: string
  mode: string
  outputFormat?: string
  aiModel?: string
  success: boolean
  errorMessage?: string
  generationTime?: number
}): Promise<void> {
  const subscription = await getOrCreateSubscription(params.companyId)

  // Check if we need to reset the usage period (new month)
  // TRIAL is a lifetime cap (no monthly reset) — only paid plans reset
  const now = new Date()
  const periodStart = subscription.usagePeriodStart
  const isNewMonth = now.getMonth() !== periodStart.getMonth() || now.getFullYear() !== periodStart.getFullYear()

  if (isNewMonth && subscription.planTier !== 'TRIAL') {
    await prisma.studioSubscription.update({
      where: { id: subscription.id },
      data: {
        generationsUsedThisMonth: params.success ? 1 : 0,
        usagePeriodStart: now,
      },
    })
  } else if (params.success) {
    await prisma.studioSubscription.update({
      where: { id: subscription.id },
      data: {
        generationsUsedThisMonth: { increment: 1 },
      },
    })
  }

  // Log the usage
  await prisma.studioUsageLog.create({
    data: {
      subscriptionId: subscription.id,
      companyId: params.companyId,
      mode: params.mode,
      outputFormat: params.outputFormat,
      aiModel: params.aiModel,
      success: params.success,
      errorMessage: params.errorMessage,
      generationTime: params.generationTime,
    },
  })
}

// ============================================
// ADMIN STATS
// ============================================

export interface StudioAdminStats {
  totalClients: number
  activeClients: number
  trialClients: number
  totalGenerationsThisMonth: number
  generationsByPlan: Record<string, number>
  recentSignups: number
  revenueThisMonth: number
}

/**
 * Get admin dashboard stats
 */
export async function getStudioAdminStats(): Promise<StudioAdminStats> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalClients,
    activeClients,
    trialClients,
    usageLogs,
    recentSignups,
    subscriptions,
  ] = await Promise.all([
    prisma.studioSubscription.count(),
    prisma.studioSubscription.count({ where: { status: 'active' } }),
    prisma.studioSubscription.count({ where: { planTier: 'TRIAL' } }),
    prisma.studioUsageLog.findMany({
      where: {
        createdAt: { gte: monthStart },
        success: true,
      },
      include: {
        subscription: { select: { planTier: true } },
      },
    }),
    prisma.studioSubscription.count({
      where: { createdAt: { gte: weekAgo } },
    }),
    prisma.studioSubscription.findMany({
      where: { status: 'active', planTier: { not: 'TRIAL' }, isComplementary: false },
      select: { monthlyRate: true },
    }),
  ])

  // Calculate generations by plan
  const generationsByPlan: Record<string, number> = {
    TRIAL: 0,
    STARTER: 0,
    PROFESSIONAL: 0,
    ENTERPRISE: 0,
  }
  usageLogs.forEach((log) => {
    const tier = log.subscription.planTier
    generationsByPlan[tier] = (generationsByPlan[tier] || 0) + 1
  })

  // Calculate revenue
  const revenueThisMonth = subscriptions.reduce((sum, sub) => {
    return sum + (sub.monthlyRate ? Number(sub.monthlyRate) : 0)
  }, 0)

  return {
    totalClients,
    activeClients,
    trialClients,
    totalGenerationsThisMonth: usageLogs.length,
    generationsByPlan,
    recentSignups,
    revenueThisMonth,
  }
}

// ============================================
// STRIPE SYNC FUNCTIONS
// ============================================

/**
 * Sync subscription from Stripe webhook data.
 * Uses upsert to handle both new and existing subscriptions idempotently.
 */
export async function syncSubscriptionFromStripe(params: {
  companyId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  planTier: StudioPlanTier
  status: string
  currentPeriodEnd: Date
}): Promise<void> {
  // Guard: do not overwrite complementary subscriptions
  const existing = await prisma.studioSubscription.findUnique({
    where: { companyId: params.companyId },
    select: { isComplementary: true },
  })
  if (existing?.isComplementary) {
    console.log(`[Stripe Sync] Skipping sync for complementary subscription: ${params.companyId}`)
    return
  }

  const planConfig = PLAN_CONFIGS[params.planTier]

  await prisma.studioSubscription.upsert({
    where: { companyId: params.companyId },
    update: {
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripePriceId: params.stripePriceId,
      planTier: params.planTier,
      planName: planConfig.name,
      monthlyGenerationsLimit: planConfig.limit,
      monthlyRate: planConfig.rate,
      status: params.status,
      currentPeriodEnd: params.currentPeriodEnd,
      cancelledAt: null,
    },
    create: {
      companyId: params.companyId,
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripePriceId: params.stripePriceId,
      planTier: params.planTier,
      planName: planConfig.name,
      monthlyGenerationsLimit: planConfig.limit,
      monthlyRate: planConfig.rate,
      status: params.status,
      currentPeriodEnd: params.currentPeriodEnd,
    },
  })
}

/**
 * Mark subscription as cancelled (stays active until period end).
 */
export async function handleSubscriptionCancelled(stripeSubscriptionId: string): Promise<void> {
  // Guard: do not modify complementary subscriptions
  const sub = await prisma.studioSubscription.findFirst({
    where: { stripeSubscriptionId },
    select: { isComplementary: true },
  })
  if (sub?.isComplementary) {
    console.log('[Stripe Sync] Skipping cancellation for complementary subscription')
    return
  }

  await prisma.studioSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: { cancelledAt: new Date() },
  })
}

/**
 * Downgrade to free tier when subscription actually expires.
 */
export async function downgradeToFreeTier(stripeSubscriptionId: string): Promise<void> {
  // Guard: do not downgrade complementary subscriptions
  const sub = await prisma.studioSubscription.findFirst({
    where: { stripeSubscriptionId },
    select: { isComplementary: true },
  })
  if (sub?.isComplementary) {
    console.log('[Stripe Sync] Skipping downgrade for complementary subscription')
    return
  }

  const planConfig = PLAN_CONFIGS.TRIAL

  await prisma.studioSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: {
      planTier: 'TRIAL',
      planName: planConfig.name,
      monthlyGenerationsLimit: planConfig.limit,
      monthlyRate: 0,
      status: 'active',
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelledAt: null,
    },
  })
}

/**
 * Pause subscription due to payment failure.
 */
export async function pauseSubscription(stripeSubscriptionId: string): Promise<void> {
  // Guard: do not pause complementary subscriptions
  const sub = await prisma.studioSubscription.findFirst({
    where: { stripeSubscriptionId },
    select: { isComplementary: true },
  })
  if (sub?.isComplementary) {
    console.log('[Stripe Sync] Skipping pause for complementary subscription')
    return
  }

  await prisma.studioSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status: 'paused' },
  })
}
