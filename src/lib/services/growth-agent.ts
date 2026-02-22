/**
 * Growth Agent Service — Autonomous Pipeline Engine
 *
 * Stateless: reads config from DB, processes one batch per invocation, logs results.
 * Called by the cron endpoint every 15 minutes, or manually via the trigger API.
 */

import { prisma } from '@/lib/db'
import { searchBusinesses } from '@/lib/services/discovery-search'
import { enrichProspectData } from '@/lib/services/prospect-enricher'
import { discoverOwners } from '@/lib/services/owner-discovery'
import { scoreProspect } from '@/lib/ai/prospect-scorer'
import {
  generateOutreachMessage,
  determineBestChannel,
  type ProspectData,
} from '@/lib/ai/outreach-composer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentStage =
  | 'discover'
  | 'enrich'
  | 'find_emails'
  | 'score'
  | 'generate_outreach'

const STAGE_ORDER: AgentStage[] = [
  'discover',
  'enrich',
  'find_emails',
  'score',
  'generate_outreach',
]

interface StageResult {
  processed: number
  succeeded: number
  failed: number
  skipped: number
  details: Record<string, any>
}

export interface AgentCycleResult {
  configId: string
  companyId: string
  stage: AgentStage | 'none'
  isDryRun: boolean
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
  itemsSkipped: number
  details: Record<string, any>
  durationMs: number
  error?: string
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run one agent cycle for a company.
 * Finds the next stage with pending work and processes a batch.
 */
export async function runAgentCycle(
  companyId: string,
  options?: { forceStage?: AgentStage; forceDryRun?: boolean }
): Promise<AgentCycleResult> {
  const startTime = Date.now()

  // Load config
  const config = await prisma.growthAgentConfig.findUnique({
    where: { companyId },
  })

  if (!config) {
    return {
      configId: '',
      companyId,
      stage: 'none',
      isDryRun: true,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      itemsSkipped: 0,
      details: { reason: 'No agent config found for this company' },
      durationMs: Date.now() - startTime,
    }
  }

  if (!config.isEnabled && !options?.forceStage) {
    return {
      configId: config.id,
      companyId,
      stage: 'none',
      isDryRun: config.isDryRun,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      itemsSkipped: 0,
      details: { reason: 'Agent is disabled' },
      durationMs: Date.now() - startTime,
    }
  }

  if (config.pausedAt && !options?.forceStage) {
    return {
      configId: config.id,
      companyId,
      stage: 'none',
      isDryRun: config.isDryRun,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      itemsSkipped: 0,
      details: { reason: `Agent paused: ${config.pauseReason || 'No reason'}` },
      durationMs: Date.now() - startTime,
    }
  }

  // Check active hours (skip for manual triggers)
  if (!options?.forceStage && !isWithinActiveHours(config)) {
    return {
      configId: config.id,
      companyId,
      stage: 'none',
      isDryRun: config.isDryRun,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      itemsSkipped: 0,
      details: { reason: 'Outside active hours' },
      durationMs: Date.now() - startTime,
    }
  }

  const isDryRun = options?.forceDryRun ?? config.isDryRun
  const batchSize = config.batchSize

  // Determine which stage to process
  let stage: AgentStage | undefined = options?.forceStage

  if (!stage) {
    const workCounts = await getStageWorkCounts(companyId, config)
    for (const s of STAGE_ORDER) {
      if (workCounts[s] > 0) {
        stage = s
        break
      }
    }
  }

  if (!stage) {
    return {
      configId: config.id,
      companyId,
      stage: 'none',
      isDryRun,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      itemsSkipped: 0,
      details: { reason: 'No pending work in any stage' },
      durationMs: Date.now() - startTime,
    }
  }

  // Process the stage
  let result: StageResult
  let error: string | undefined

  try {
    switch (stage) {
      case 'discover':
        result = await processDiscover(companyId, config, batchSize, isDryRun)
        break
      case 'enrich':
        result = await processEnrich(companyId, config, batchSize, isDryRun)
        break
      case 'find_emails':
        result = await processFindEmails(companyId, config, batchSize, isDryRun)
        break
      case 'score':
        result = await processScore(companyId, config, batchSize, isDryRun)
        break
      case 'generate_outreach':
        result = await processGenerateOutreach(companyId, config, batchSize, isDryRun)
        break
      default:
        result = { processed: 0, succeeded: 0, failed: 0, skipped: 0, details: {} }
    }
  } catch (err: any) {
    error = err.message || 'Unknown error'
    result = { processed: 0, succeeded: 0, failed: 0, skipped: 0, details: { error } }
  }

  // Log the run
  await prisma.growthAgentRun.create({
    data: {
      configId: config.id,
      stage,
      status: error ? 'failed' : 'completed',
      isDryRun,
      itemsProcessed: result.processed,
      itemsSucceeded: result.succeeded,
      itemsFailed: result.failed,
      itemsSkipped: result.skipped,
      details: result.details,
      errorMessage: error,
      completedAt: new Date(),
      durationMs: Date.now() - startTime,
    },
  })

  // Also log to GrowthAutomationLog for consistency with existing logging
  await prisma.growthAutomationLog.create({
    data: {
      companyId,
      type: stage === 'discover' ? 'discovery' : stage === 'enrich' ? 'enrichment' : stage === 'generate_outreach' ? 'sequence' : 'pipeline',
      status: error ? 'failed' : 'completed',
      details: {
        agent: true,
        stage,
        isDryRun,
        ...result.details,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
      },
      errorMessage: error,
    },
  })

  return {
    configId: config.id,
    companyId,
    stage,
    isDryRun,
    itemsProcessed: result.processed,
    itemsSucceeded: result.succeeded,
    itemsFailed: result.failed,
    itemsSkipped: result.skipped,
    details: result.details,
    durationMs: Date.now() - startTime,
    error,
  }
}

// ---------------------------------------------------------------------------
// Stage work detection
// ---------------------------------------------------------------------------

async function getStageWorkCounts(
  companyId: string,
  config: any
): Promise<Record<AgentStage, number>> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check daily rate limits
  const todayRuns = await prisma.growthAgentRun.findMany({
    where: {
      config: { companyId },
      startedAt: { gte: today },
      status: 'completed',
      isDryRun: false,
    },
    select: { stage: true, itemsSucceeded: true },
  })

  const dailyUsage: Record<string, number> = {}
  for (const run of todayRuns) {
    dailyUsage[run.stage] = (dailyUsage[run.stage] || 0) + run.itemsSucceeded
  }

  const counts: Record<AgentStage, number> = {
    discover: 0,
    enrich: 0,
    find_emails: 0,
    score: 0,
    generate_outreach: 0,
  }

  // Discovery: always work if not at daily limit and has targets configured
  const targetLocations = (config.targetLocations as any[]) || []
  const targetTypes = (config.targetBusinessTypes as string[]) || []
  if (
    targetLocations.length > 0 &&
    targetTypes.length > 0 &&
    (dailyUsage['discover'] || 0) < config.maxDiscoveriesPerDay
  ) {
    counts.discover = 1
  }

  // Enrich: prospects that are new and not yet enriched
  counts.enrich = await prisma.prospect.count({
    where: {
      companyId,
      status: 'new',
      aiEnriched: false,
    },
  })

  // Find emails: enriched prospects with no email contacts
  const prospectsWithoutEmails = await prisma.prospect.findMany({
    where: {
      companyId,
      aiEnriched: true,
      contacts: { none: { email: { not: null } } },
    },
    select: { id: true },
    take: 1,
  })
  if (
    prospectsWithoutEmails.length > 0 &&
    (dailyUsage['find_emails'] || 0) < config.maxEmailsPerDay
  ) {
    counts.find_emails = prospectsWithoutEmails.length
  }

  // Score: enriched prospects without AI score
  counts.score = await prisma.prospect.count({
    where: {
      companyId,
      aiEnriched: true,
      aiScore: null,
    },
  })

  // Generate outreach: scored prospects above threshold with email but no outreach message
  const outreachCandidates = await prisma.prospect.findMany({
    where: {
      companyId,
      aiScore: { gte: config.minScoreForOutreach },
      contacts: { some: { email: { not: null } } },
      outreachMessages: { none: {} },
    },
    select: { id: true },
    take: 1,
  })
  if (
    outreachCandidates.length > 0 &&
    (dailyUsage['generate_outreach'] || 0) < config.maxOutreachPerDay
  ) {
    counts.generate_outreach = outreachCandidates.length
  }

  return counts
}

// ---------------------------------------------------------------------------
// Stage processors
// ---------------------------------------------------------------------------

async function processDiscover(
  companyId: string,
  config: any,
  batchSize: number,
  isDryRun: boolean
): Promise<StageResult> {
  const targetLocations = (config.targetLocations as any[]) || []
  const targetTypes = (config.targetBusinessTypes as string[]) || []
  const sources = (config.targetSources as string[]) || ['google_places', 'yelp']

  if (targetLocations.length === 0 || targetTypes.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      details: { reason: 'No target locations or business types configured' },
    }
  }

  // Round-robin: pick next combo based on recent runs
  const lastRun = await prisma.growthAgentRun.findFirst({
    where: {
      config: { companyId },
      stage: 'discover',
      status: 'completed',
    },
    orderBy: { startedAt: 'desc' },
    select: { details: true },
  })

  const lastIndex = (lastRun?.details as any)?.comboIndex ?? -1
  const combos: Array<{ location: any; type: string }> = []
  for (const loc of targetLocations) {
    for (const type of targetTypes) {
      combos.push({ location: loc, type })
    }
  }

  const comboIndex = (lastIndex + 1) % combos.length
  const combo = combos[comboIndex]
  const locationStr = `${combo.location.city}, ${combo.location.state}`

  // Search external APIs
  const searchResult = await searchBusinesses({
    location: locationStr,
    type: combo.type,
    sources,
    minRating: config.minRating ?? undefined,
  })

  let created = 0
  let skipped = 0
  const createdNames: string[] = []

  // Deduplicate and create (up to batchSize)
  for (const biz of searchResult.results.slice(0, batchSize * 3)) {
    if (created >= batchSize) break

    // Check for duplicate
    const existing = await prisma.prospect.findFirst({
      where: {
        companyId,
        companyName: { equals: biz.name, mode: 'insensitive' },
      },
      select: { id: true },
    })

    if (existing) {
      skipped++
      continue
    }

    if (isDryRun) {
      created++
      createdNames.push(biz.name)
      continue
    }

    await prisma.prospect.create({
      data: {
        companyId,
        companyName: biz.name,
        businessType: combo.type,
        address: biz.address,
        website: biz.website || null,
        phone: biz.phone || null,
        priceLevel: biz.price || null,
        status: 'new',
        source: 'ai_discovery',
        sourceDetail: 'Growth Agent',
        discoveryData: {
          source: biz.source,
          rating: biz.rating,
          reviewCount: biz.reviewCount,
          categories: biz.categories || biz.types || [],
          placeId: biz.placeId,
          yelpId: biz.yelpId,
          discoveredAt: new Date().toISOString(),
        },
      },
    })

    created++
    createdNames.push(biz.name)
  }

  return {
    processed: searchResult.total,
    succeeded: created,
    failed: 0,
    skipped,
    details: {
      comboIndex,
      location: locationStr,
      type: combo.type,
      searchResults: searchResult.total,
      created: createdNames,
      warnings: searchResult.warnings,
    },
  }
}

async function processEnrich(
  companyId: string,
  config: any,
  batchSize: number,
  isDryRun: boolean
): Promise<StageResult> {
  const prospects = await prisma.prospect.findMany({
    where: {
      companyId,
      status: 'new',
      aiEnriched: false,
    },
    include: { contacts: true },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  })

  let succeeded = 0
  let failed = 0
  const enrichedNames: string[] = []

  const systemUserId = await getSystemUser(companyId)

  for (const prospect of prospects) {
    try {
      if (isDryRun) {
        succeeded++
        enrichedNames.push(prospect.companyName)
        continue
      }

      const { externalData, aiEnrichment, googleData, yelpData } = await enrichProspectData({
        companyName: prospect.companyName,
        legalName: prospect.legalName,
        industry: prospect.industry,
        businessType: prospect.businessType,
        address: prospect.address,
        website: prospect.website,
        phone: prospect.phone,
        contacts: prospect.contacts.map((c) => ({
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
        })),
      })

      // Build update
      const updateData: any = {
        aiEnriched: true,
        enrichmentDate: new Date(),
      }

      if (externalData.phone && !prospect.phone) updateData.phone = externalData.phone
      if (externalData.website && !prospect.website) updateData.website = externalData.website

      const priceLevel = externalData.googlePriceLevel || externalData.yelpPrice
      if (priceLevel && !prospect.priceLevel) updateData.priceLevel = priceLevel

      if (aiEnrichment.estimatedSize) updateData.estimatedSize = aiEnrichment.estimatedSize
      if (aiEnrichment.industry) updateData.industry = aiEnrichment.industry
      if (aiEnrichment.businessType && !prospect.businessType) updateData.businessType = aiEnrichment.businessType
      if (aiEnrichment.estimatedValue) updateData.estimatedValue = aiEnrichment.estimatedValue
      if (aiEnrichment.potentialValue) {
        updateData.priority =
          aiEnrichment.potentialValue === 'high' ? 'high' :
          aiEnrichment.potentialValue === 'low' ? 'low' : 'medium'
      }

      updateData.discoveryData = {
        ...((prospect.discoveryData as any) || {}),
        googlePlaces: googleData,
        yelp: yelpData,
        externalData,
        aiEnrichment,
        enrichedAt: new Date().toISOString(),
      }

      await prisma.prospect.update({
        where: { id: prospect.id },
        data: updateData,
      })

      // Activity log
      if (systemUserId) {
        await prisma.prospectActivity.create({
          data: {
            prospectId: prospect.id,
            userId: systemUserId,
            type: 'note',
            title: 'AI Enrichment (Agent)',
            description: `Auto-enriched by Growth Agent. ${aiEnrichment.insights || ''}`,
            metadata: { externalData: externalData as any, aiEnrichment: aiEnrichment as any, agent: true },
          },
        })
      }

      succeeded++
      enrichedNames.push(prospect.companyName)
    } catch (error: any) {
      console.error(`[Growth Agent] Error enriching ${prospect.companyName}:`, error.message)
      failed++
    }
  }

  return {
    processed: prospects.length,
    succeeded,
    failed,
    skipped: 0,
    details: { enriched: enrichedNames },
  }
}

async function processFindEmails(
  companyId: string,
  config: any,
  batchSize: number,
  isDryRun: boolean
): Promise<StageResult> {
  const prospects = await prisma.prospect.findMany({
    where: {
      companyId,
      aiEnriched: true,
      contacts: { none: { email: { not: null } } },
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  })

  let succeeded = 0
  let failed = 0
  const foundEmails: Array<{ prospect: string; email: string | null }> = []

  for (const prospect of prospects) {
    try {
      const address = prospect.address as any
      const city = address?.city || ''
      const state = address?.state || ''

      if (!city) {
        failed++
        continue
      }

      if (isDryRun) {
        succeeded++
        foundEmails.push({ prospect: prospect.companyName, email: '(dry run)' })
        continue
      }

      const result = await discoverOwners({
        businessName: prospect.companyName,
        city,
        state,
        website: prospect.website || undefined,
      })

      // Create contacts for discovered owners
      let emailFound = false
      for (const owner of result.owners) {
        if (!owner.firstName && !owner.lastName) continue

        await prisma.prospectContact.create({
          data: {
            prospectId: prospect.id,
            firstName: owner.firstName || '',
            lastName: owner.lastName || '',
            email: owner.email,
            phone: owner.phone,
            title: owner.title,
            role: 'primary',
            isDecisionMaker: true,
            emailConfidence: owner.emailConfidence,
            emailSource: owner.emailSource || undefined,
          },
        })

        if (owner.email) emailFound = true
      }

      if (emailFound) {
        succeeded++
        const bestEmail = result.owners.find((o) => o.email)?.email || null
        foundEmails.push({ prospect: prospect.companyName, email: bestEmail })
      } else {
        failed++
        foundEmails.push({ prospect: prospect.companyName, email: null })
      }
    } catch (error: any) {
      console.error(`[Growth Agent] Error finding emails for ${prospect.companyName}:`, error.message)
      failed++
    }
  }

  return {
    processed: prospects.length,
    succeeded,
    failed,
    skipped: 0,
    details: { foundEmails },
  }
}

async function processScore(
  companyId: string,
  config: any,
  batchSize: number,
  isDryRun: boolean
): Promise<StageResult> {
  const prospects = await prisma.prospect.findMany({
    where: {
      companyId,
      aiEnriched: true,
      aiScore: null,
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  })

  let succeeded = 0
  let failed = 0
  const scored: Array<{ prospect: string; score: number; priority: string }> = []

  for (const prospect of prospects) {
    try {
      if (isDryRun) {
        succeeded++
        scored.push({ prospect: prospect.companyName, score: 0, priority: 'medium' })
        continue
      }

      const address = prospect.address as any
      const result = await scoreProspect({
        companyName: prospect.companyName,
        businessType: prospect.businessType || undefined,
        industry: prospect.industry || undefined,
        address: address ? { city: address.city, state: address.state } : undefined,
        website: prospect.website || undefined,
        priceLevel: prospect.priceLevel || undefined,
        employeeCount: prospect.employeeCount || undefined,
        estimatedSize: prospect.estimatedSize || undefined,
        discoveryData: prospect.discoveryData,
      })

      await prisma.prospect.update({
        where: { id: prospect.id },
        data: {
          aiScore: result.score,
          aiScoreReason: result.reasoning,
          priority: result.priority,
        },
      })

      succeeded++
      scored.push({
        prospect: prospect.companyName,
        score: result.score,
        priority: result.priority,
      })
    } catch (error: any) {
      console.error(`[Growth Agent] Error scoring ${prospect.companyName}:`, error.message)
      failed++
    }
  }

  return {
    processed: prospects.length,
    succeeded,
    failed,
    skipped: 0,
    details: { scored },
  }
}

async function processGenerateOutreach(
  companyId: string,
  config: any,
  batchSize: number,
  isDryRun: boolean
): Promise<StageResult> {
  const prospects = await prisma.prospect.findMany({
    where: {
      companyId,
      aiScore: { gte: config.minScoreForOutreach },
      contacts: { some: { email: { not: null } } },
      outreachMessages: { none: {} },
    },
    include: {
      contacts: true,
    },
    orderBy: { aiScore: 'desc' },
    take: batchSize,
  })

  if (prospects.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, details: {} }
  }

  // Ensure we have a campaign for the agent
  let campaignId = config.defaultCampaignId

  if (!isDryRun && !campaignId) {
    const systemUserId = await getSystemUser(companyId)
    if (systemUserId) {
      const campaign = await prisma.outreachCampaign.create({
        data: {
          companyId,
          createdById: systemUserId,
          name: `Growth Agent — Auto Campaign`,
          description: 'Automated outreach generated by the Growth Agent',
          status: 'active',
        },
      })
      campaignId = campaign.id

      // Save it to config for future runs
      await prisma.growthAgentConfig.update({
        where: { companyId },
        data: { defaultCampaignId: campaignId },
      })
    }
  }

  let succeeded = 0
  let failed = 0
  const generated: Array<{ prospect: string; channel: string; subject?: string }> = []

  const tone = (config.outreachTone || 'friendly') as 'professional' | 'friendly' | 'casual' | 'warm'

  for (const prospect of prospects) {
    try {
      const address = prospect.address as any
      const primaryContact = prospect.contacts.find((c) => c.email) || prospect.contacts[0]

      // Build prospect data for the composer
      const prospectData: ProspectData = {
        companyName: prospect.companyName,
        businessType: prospect.businessType || undefined,
        industry: prospect.industry || undefined,
        address: address ? { city: address.city, state: address.state } : undefined,
        website: prospect.website || undefined,
        priceLevel: prospect.priceLevel || undefined,
        contacts: prospect.contacts.map((c) => ({
          firstName: c.firstName || undefined,
          lastName: c.lastName || undefined,
          title: c.title || undefined,
          email: c.email || undefined,
          phone: c.phone || undefined,
        })),
        notes: prospect.notes || undefined,
        aiScore: prospect.aiScore || undefined,
        aiScoreReason: prospect.aiScoreReason || undefined,
      }

      // Determine channel
      const channel =
        config.outreachChannel === 'auto'
          ? determineBestChannel(prospectData)
          : (config.outreachChannel as 'email' | 'sms' | 'linkedin' | 'instagram_dm')

      if (isDryRun) {
        succeeded++
        generated.push({ prospect: prospect.companyName, channel })
        continue
      }

      const message = await generateOutreachMessage({
        channel,
        prospect: prospectData,
        tone,
        purpose: 'cold_outreach',
      })

      // Create OutreachMessage with pending approval
      await prisma.outreachMessage.create({
        data: {
          campaignId: campaignId || undefined,
          prospectId: prospect.id,
          step: 1,
          channel,
          subject: message.subject,
          body: message.body,
          isAiGenerated: true,
          status: 'pending',
          approvalStatus: 'pending',
        },
      })

      succeeded++
      generated.push({
        prospect: prospect.companyName,
        channel,
        subject: message.subject,
      })
    } catch (error: any) {
      console.error(
        `[Growth Agent] Error generating outreach for ${prospect.companyName}:`,
        error.message
      )
      failed++
    }
  }

  return {
    processed: prospects.length,
    succeeded,
    failed,
    skipped: 0,
    details: { generated, campaignId },
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isWithinActiveHours(config: any): boolean {
  const now = new Date()

  // Simple hour-based check using the configured timezone
  // For production accuracy we'd use a timezone library, but for
  // America/Chicago this approximation works (UTC-6 or UTC-5)
  const utcHour = now.getUTCHours()
  // Central Time is UTC-6 (CST) or UTC-5 (CDT)
  const centralOffset = -6 // CST; close enough for scheduling purposes
  const localHour = (utcHour + centralOffset + 24) % 24

  return localHour >= config.activeHoursStart && localHour < config.activeHoursEnd
}

async function getSystemUser(companyId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: {
      companyId,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  return user?.id || null
}
