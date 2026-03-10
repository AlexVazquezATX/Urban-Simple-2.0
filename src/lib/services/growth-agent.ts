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
import {
  buildProspectFilter,
  type FilterCriteria,
  type ProcessingMode,
} from '@/lib/services/growth-agent-filter'

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
  options?: { forceStage?: AgentStage; forceDryRun?: boolean; manualTrigger?: boolean }
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

  if (!config.isEnabled && !options?.forceStage && !options?.manualTrigger) {
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
  if (!options?.forceStage && !options?.manualTrigger && !isWithinActiveHours(config)) {
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
// Full pipeline runner — processes ALL stages until no work remains
// ---------------------------------------------------------------------------

export interface PipelineStageResult {
  stage: AgentStage
  batches: number
  totalProcessed: number
  totalSucceeded: number
  totalFailed: number
  totalSkipped: number
  durationMs: number
  error?: string
}

export interface FullPipelineResult {
  configId: string
  companyId: string
  isDryRun: boolean
  stages: PipelineStageResult[]
  totalProcessed: number
  totalSucceeded: number
  totalFailed: number
  durationMs: number
  stoppedEarly?: string
}

/**
 * Run the full pipeline for a company — loops through all stages,
 * processing every batch until there's no work left.
 *
 * Goal-driven: if find_emails doesn't hit the email target and discovery
 * hasn't maxed out, the pipeline loops back to discover → enrich → find_emails
 * to keep feeding fresh prospects into the funnel.
 */
export async function runFullPipeline(
  companyId: string,
  options?: { forceDryRun?: boolean }
): Promise<FullPipelineResult> {
  const startTime = Date.now()

  const config = await prisma.growthAgentConfig.findUnique({
    where: { companyId },
  })

  if (!config) {
    return {
      configId: '',
      companyId,
      isDryRun: true,
      stages: [],
      totalProcessed: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      durationMs: Date.now() - startTime,
      stoppedEarly: 'No agent config found',
    }
  }

  const isDryRun = options?.forceDryRun ?? config.isDryRun
  const batchSize = config.batchSize
  const emailTarget = config.maxEmailsPerDay || 10

  const stageResults: PipelineStageResult[] = []
  let grandProcessed = 0
  let grandSucceeded = 0
  let grandFailed = 0

  // Helper: run a single stage until no more work
  const runStage = async (stage: AgentStage): Promise<PipelineStageResult | null> => {
    const stageStart = Date.now()
    let batches = 0
    let stageProcessed = 0
    let stageSucceeded = 0
    let stageFailed = 0
    let stageSkipped = 0
    let stageError: string | undefined

    const MAX_BATCHES = 50
    while (batches < MAX_BATCHES) {
      const workCounts = await getStageWorkCounts(companyId, config)
      if (workCounts[stage] <= 0) break

      let result: StageResult
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
        stageError = err.message || 'Unknown error'
        result = { processed: 0, succeeded: 0, failed: 0, skipped: 0, details: { error: stageError } }
      }

      batches++
      stageProcessed += result.processed
      stageSucceeded += result.succeeded
      stageFailed += result.failed
      stageSkipped += result.skipped

      await prisma.growthAgentRun.create({
        data: {
          configId: config.id,
          stage,
          status: stageError ? 'failed' : 'completed',
          isDryRun,
          itemsProcessed: result.processed,
          itemsSucceeded: result.succeeded,
          itemsFailed: result.failed,
          itemsSkipped: result.skipped,
          details: { ...result.details, pipelineBatch: batches },
          errorMessage: stageError,
          completedAt: new Date(),
          durationMs: Date.now() - stageStart,
        },
      })

      if (result.processed === 0 || stageError) break
      if (result.succeeded === 0) break
      if (isDryRun) break
    }

    if (stageProcessed > 0 || stageError) {
      const sr: PipelineStageResult = {
        stage,
        batches,
        totalProcessed: stageProcessed,
        totalSucceeded: stageSucceeded,
        totalFailed: stageFailed,
        totalSkipped: stageSkipped,
        durationMs: Date.now() - stageStart,
        error: stageError,
      }
      stageResults.push(sr)
      grandProcessed += stageProcessed
      grandSucceeded += stageSucceeded
      grandFailed += stageFailed
      return sr
    }
    return null
  }

  // Helper: count how many emails we've found so far today
  const countEmailsFound = async (): Promise<number> => {
    const baseFilter = buildProspectFilter(
      companyId,
      (config.processingMode || 'all') as ProcessingMode,
      (config.filterCriteria || {}) as FilterCriteria
    )
    return prisma.prospect.count({
      where: {
        ...baseFilter,
        aiEnriched: true,
        contacts: { some: { email: { not: null } } },
      },
    })
  }

  // --- Main pipeline loop ---
  // Phase 1: Run initial stages (enrich → find_emails)
  await runStage('enrich')
  const emailResult = await runStage('find_emails')
  let emailsFound = emailResult?.totalSucceeded || 0

  // Phase 2: If we haven't hit the email target, loop back to discover more
  // Safety cap: max 3 pipeline loops to prevent runaway API spend
  const MAX_PIPELINE_LOOPS = 3
  let loopCount = 0
  while (emailsFound < emailTarget && loopCount < MAX_PIPELINE_LOOPS && !isDryRun) {
    loopCount++
    console.log(`[Growth Agent] Pipeline loop ${loopCount}: ${emailsFound}/${emailTarget} emails found, discovering more...`)

    // Check if discovery can still run (has targets configured and hasn't hit daily cap)
    const workCounts = await getStageWorkCounts(companyId, config)
    if (workCounts.discover <= 0) {
      console.log('[Growth Agent] Discovery cap reached or no targets configured, stopping loops')
      break
    }

    // Discover → Enrich → Find Emails
    const discoverResult = await runStage('discover')
    if (!discoverResult || discoverResult.totalSucceeded === 0) {
      console.log('[Growth Agent] Discovery found nothing new, stopping loops')
      break
    }

    await runStage('enrich')
    const moreEmails = await runStage('find_emails')
    emailsFound += moreEmails?.totalSucceeded || 0
  }

  if (loopCount > 0) {
    console.log(`[Growth Agent] Pipeline completed after ${loopCount} discovery loop(s): ${emailsFound} emails found`)
  }

  // Phase 3: Score and generate outreach for everything we've gathered
  await runStage('score')
  await runStage('generate_outreach')

  // Log the overall pipeline run
  const totalEmails = await countEmailsFound()
  await prisma.growthAutomationLog.create({
    data: {
      companyId,
      type: 'pipeline',
      status: grandFailed > 0 ? 'partial' : 'completed',
      details: {
        agent: true,
        fullPipeline: true,
        isDryRun,
        pipelineLoops: loopCount + 1,
        emailTarget,
        emailsInDatabase: totalEmails,
        stages: stageResults.map(s => ({ stage: s.stage, succeeded: s.totalSucceeded, failed: s.totalFailed })),
        totalProcessed: grandProcessed,
        totalSucceeded: grandSucceeded,
        totalFailed: grandFailed,
      },
    },
  })

  return {
    configId: config.id,
    companyId,
    isDryRun,
    stages: stageResults,
    totalProcessed: grandProcessed,
    totalSucceeded: grandSucceeded,
    totalFailed: grandFailed,
    durationMs: Date.now() - startTime,
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

  // Build base prospect filter from processing mode
  const baseFilter = buildProspectFilter(
    companyId,
    (config.processingMode || 'all') as ProcessingMode,
    (config.filterCriteria || {}) as FilterCriteria
  )

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
      ...baseFilter,
      status: 'new',
      aiEnriched: false,
    },
  })

  // Find emails: enriched prospects with no email contacts
  // Daily cap is based on emails actually FOUND (succeeded), not prospects searched
  const prospectsWithoutEmails = await prisma.prospect.findMany({
    where: {
      ...baseFilter,
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
      ...baseFilter,
      aiEnriched: true,
      aiScore: null,
    },
  })

  // Generate outreach: scored prospects above threshold with email but no outreach message
  const outreachCandidates = await prisma.prospect.findMany({
    where: {
      ...baseFilter,
      aiScore: { gte: config.minScoreForOutreach },
      doNotContact: false,
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
  const baseFilter = buildProspectFilter(
    companyId,
    (config.processingMode || 'all') as ProcessingMode,
    (config.filterCriteria || {}) as FilterCriteria
  )

  const prospects = await prisma.prospect.findMany({
    where: {
      ...baseFilter,
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
  const baseFilter = buildProspectFilter(
    companyId,
    (config.processingMode || 'all') as ProcessingMode,
    (config.filterCriteria || {}) as FilterCriteria
  )

  const emailTarget = config.maxEmailsPerDay || 10
  let totalProcessed = 0
  let succeeded = 0
  let failed = 0
  const foundEmails: Array<{ prospect: string; email: string | null }> = []
  // Diagnostics: track WHY each prospect failed so we can debug 0/N results
  const diagnostics: Array<{
    prospect: string
    website: string | null
    domainFound: string | null
    ownersFound: number
    emailsFound: number
    failReason: string | null
  }> = []

  // Goal-driven loop: keep pulling candidates until we find enough emails
  // or run out of prospects to search. Safety cap: 5 rounds max.
  const MAX_ROUNDS = 5
  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Fetch candidates, then filter out already-searched prospects in code
    const candidates = await prisma.prospect.findMany({
      where: {
        ...baseFilter,
        aiEnriched: true,
        contacts: { none: { email: { not: null } } },
      },
      orderBy: { enrichmentDate: 'desc' },
      take: batchSize * 3,
    })

    const prospects = candidates
      .filter((p) => !(p.discoveryData as any)?.emailSearchedAt)
      .slice(0, batchSize)

    if (prospects.length === 0) break // No more candidates to search

    for (const prospect of prospects) {
      // Stop early if we've hit the email target
      if (succeeded >= emailTarget) break

      try {
        const address = prospect.address as any
        const city = address?.city || ''
        const state = address?.state || ''

        if (!city) {
          failed++
          totalProcessed++
          diagnostics.push({
            prospect: prospect.companyName,
            website: prospect.website,
            domainFound: null,
            ownersFound: 0,
            emailsFound: 0,
            failReason: 'no_city_in_address',
          })
          continue
        }

        if (isDryRun) {
          succeeded++
          totalProcessed++
          foundEmails.push({ prospect: prospect.companyName, email: '(dry run)' })
          continue
        }

        const result = await discoverOwners({
          businessName: prospect.companyName,
          city,
          state,
          website: prospect.website || undefined,
        })

        // Build diagnostic info for this prospect
        const diag = {
          prospect: prospect.companyName,
          website: prospect.website,
          domainFound: result.domain,
          ownersFound: result.owners.length,
          emailsFound: result.meta.emailsFound.length,
          hospitalityEmails: result.hospitalityEmails?.length || 0,
          failReason: null as string | null,
        }

        // Upsert contacts for discovered owners (avoid duplicates on re-runs)
        let emailFound = false
        for (const owner of result.owners) {
          if (!owner.firstName && !owner.lastName) continue

          const existing = await prisma.prospectContact.findFirst({
            where: {
              prospectId: prospect.id,
              firstName: owner.firstName || '',
              lastName: owner.lastName || '',
            },
          })

          if (existing) {
            if (owner.email && !existing.email) {
              await prisma.prospectContact.update({
                where: { id: existing.id },
                data: {
                  email: owner.email,
                  emailConfidence: owner.emailConfidence,
                  emailSource: owner.emailSource || undefined,
                  phone: owner.phone || existing.phone,
                  title: owner.title || existing.title,
                },
              })
            }
          } else {
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
          }

          if (owner.email) emailFound = true
        }

        // If no owner had an email, check hospitality emails (verified patterns
        // like info@domain.com, gm@domain.com, or emails scraped from the website)
        if (!emailFound && result.hospitalityEmails?.length > 0) {
          // Use the highest-confidence verified hospitality email
          const bestHospitality = result.hospitalityEmails
            .sort((a, b) => b.confidence - a.confidence)[0]

          if (bestHospitality) {
            const existing = await prisma.prospectContact.findFirst({
              where: {
                prospectId: prospect.id,
                email: bestHospitality.email,
              },
            })

            if (!existing) {
              await prisma.prospectContact.create({
                data: {
                  prospectId: prospect.id,
                  firstName: '',
                  lastName: '',
                  email: bestHospitality.email,
                  title: bestHospitality.role || 'General Contact',
                  role: 'general',
                  isDecisionMaker: false,
                  emailConfidence: bestHospitality.confidence,
                  emailSource: 'hospitality_pattern',
                },
              })
              emailFound = true
              console.log(`[Growth Agent] Saved hospitality email for ${prospect.companyName}: ${bestHospitality.email}`)
            }
          }
        }

        // Determine failure reason for diagnostics
        if (!emailFound) {
          if (!result.domain) {
            diag.failReason = 'no_domain'
          } else if (result.owners.length === 0 && result.hospitalityEmails.length === 0) {
            diag.failReason = 'no_owners_no_patterns'
          } else {
            diag.failReason = 'owners_found_but_no_emails'
          }
        }

        // Mark that we've attempted email search (prevents re-processing on next run)
        await prisma.prospect.update({
          where: { id: prospect.id },
          data: {
            discoveryData: {
              ...((prospect.discoveryData as any) || {}),
              emailSearchedAt: new Date().toISOString(),
              emailSearchResult: emailFound ? 'found' : 'not_found',
              emailDiagnostics: {
                domain: result.domain,
                ownersFound: result.owners.length,
                ownerNames: result.meta.ownerNamesFound,
                hospitalityEmails: result.hospitalityEmails?.map((e) => e.email) || [],
                websiteEmailsFound: result.meta.emailsFound.length,
                yelpFound: result.meta.yelpFound,
                googleFound: result.meta.googleFound,
                hunterFound: result.meta.hunterFound,
                failReason: diag.failReason,
              },
            },
          },
        })

        diagnostics.push(diag)
        totalProcessed++
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
        totalProcessed++
        diagnostics.push({
          prospect: prospect.companyName,
          website: prospect.website,
          domainFound: null,
          ownersFound: 0,
          emailsFound: 0,
          failReason: `error: ${error.message}`,
        })
      }
    }

    // If we've hit the email target, stop searching
    if (succeeded >= emailTarget) {
      console.log(`[Growth Agent] Email target reached: ${succeeded}/${emailTarget}`)
      break
    }
  }

  // Log diagnostic summary for debugging
  if (diagnostics.length > 0) {
    const reasons: Record<string, number> = {}
    for (const d of diagnostics) {
      const r = d.failReason || 'success'
      reasons[r] = (reasons[r] || 0) + 1
    }
    console.log(`[Growth Agent] Email search diagnostics:`, JSON.stringify(reasons))
    const noDomain = diagnostics.filter((d) => d.failReason === 'no_domain').length
    const noOwners = diagnostics.filter((d) => d.failReason === 'no_owners_found').length
    const ownersNoEmail = diagnostics.filter((d) => d.failReason === 'owners_found_but_no_emails').length
    console.log(`[Growth Agent] Breakdown: ${noDomain} no domain, ${noOwners} no owners, ${ownersNoEmail} owners but no email, ${succeeded} success`)
  }

  return {
    processed: totalProcessed,
    succeeded,
    failed,
    skipped: 0,
    details: { foundEmails, emailTarget, rounds: 'goal-driven', diagnostics },
  }
}

async function processScore(
  companyId: string,
  config: any,
  batchSize: number,
  isDryRun: boolean
): Promise<StageResult> {
  const baseFilter = buildProspectFilter(
    companyId,
    (config.processingMode || 'all') as ProcessingMode,
    (config.filterCriteria || {}) as FilterCriteria
  )

  const prospects = await prisma.prospect.findMany({
    where: {
      ...baseFilter,
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
  const baseFilter = buildProspectFilter(
    companyId,
    (config.processingMode || 'all') as ProcessingMode,
    (config.filterCriteria || {}) as FilterCriteria
  )

  const prospects = await prisma.prospect.findMany({
    where: {
      ...baseFilter,
      aiScore: { gte: config.minScoreForOutreach },
      doNotContact: false,
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

// ---------------------------------------------------------------------------
// Contact-First Discovery
// ---------------------------------------------------------------------------
// Inverted pipeline: discover businesses → immediately check for emails →
// only create prospects that have verified email data.

export interface ContactFirstParams {
  companyId: string
  city: string
  state: string
  businessTypes: string[]
  targetCount: number
  sources?: string[]
}

export interface ContactFirstResult {
  discovered: number
  skippedNoWebsite: number
  skippedDuplicate: number
  skippedNoEmail: number
  created: number
  prospects: Array<{
    name: string
    website: string | null
    email: string | null
    emailSource: string | null
    ownersFound: number
  }>
  warnings: string[]
}

export async function contactFirstDiscovery(
  params: ContactFirstParams
): Promise<ContactFirstResult> {
  const {
    companyId,
    city,
    state,
    businessTypes,
    targetCount,
    sources = ['google_places', 'yelp'],
  } = params

  const result: ContactFirstResult = {
    discovered: 0,
    skippedNoWebsite: 0,
    skippedDuplicate: 0,
    skippedNoEmail: 0,
    created: 0,
    prospects: [],
    warnings: [],
  }

  if (!city || !state || businessTypes.length === 0) {
    result.warnings.push('City, state, and at least one business type are required')
    return result
  }

  const location = `${city}, ${state}`

  // Discover businesses from all requested types
  const allBusinesses: Array<any> = []
  for (const type of businessTypes) {
    try {
      const searchResult = await searchBusinesses({
        location,
        type,
        sources,
      })
      for (const biz of searchResult.results) {
        allBusinesses.push({ ...biz, businessType: type })
      }
      if (searchResult.warnings.length) {
        result.warnings.push(...searchResult.warnings)
      }
    } catch (error: any) {
      result.warnings.push(`Search failed for ${type}: ${error.message}`)
    }
  }

  result.discovered = allBusinesses.length
  console.log(`[Contact-First] Discovered ${allBusinesses.length} businesses in ${location}`)

  if (allBusinesses.length === 0) {
    result.warnings.push(`No businesses found for "${businessTypes.join(', ')}" in ${location}`)
    return result
  }

  // Process each business — stop when we have enough
  const PROCESSING_CAP = targetCount * 10 // Check up to 10x target to find enough
  let processed = 0

  for (const biz of allBusinesses) {
    if (result.created >= targetCount) break
    if (processed >= PROCESSING_CAP) break
    processed++

    // Must have a website for domain-based email search
    if (!biz.website) {
      result.skippedNoWebsite++
      continue
    }

    // Check for duplicate in database
    const existing = await prisma.prospect.findFirst({
      where: {
        companyId,
        companyName: { equals: biz.name, mode: 'insensitive' },
      },
      select: { id: true },
    })

    if (existing) {
      result.skippedDuplicate++
      continue
    }

    // The key: try to find emails BEFORE creating the prospect
    console.log(`[Contact-First] Checking ${biz.name} (${biz.website})...`)

    try {
      const discovery = await discoverOwners({
        businessName: biz.name,
        city: biz.address?.city || city,
        state: biz.address?.state || state,
        website: biz.website,
      })

      // Check if we found any email — from owners or hospitality patterns
      const ownersWithEmail = discovery.owners.filter((o) => o.email)
      const verifiedHospitality = discovery.hospitalityEmails.filter((e) => e.confidence >= 80)
      const hasEmail = ownersWithEmail.length > 0 || verifiedHospitality.length > 0

      if (!hasEmail) {
        result.skippedNoEmail++
        result.prospects.push({
          name: biz.name,
          website: biz.website,
          email: null,
          emailSource: null,
          ownersFound: discovery.owners.length,
        })
        console.log(`[Contact-First] Skipped ${biz.name} — no email found`)
        continue
      }

      // Email found! Create the prospect
      const prospect = await prisma.prospect.create({
        data: {
          companyId,
          companyName: biz.name,
          businessType: biz.businessType,
          address: biz.address || { city, state },
          website: biz.website,
          phone: discovery.businessInfo.phone || biz.phone || null,
          priceLevel: discovery.businessInfo.priceLevel || biz.price || null,
          status: 'new',
          source: 'ai_discovery',
          sourceDetail: 'Contact-First Discovery',
          aiEnriched: true,
          enrichmentDate: new Date(),
          aiScore: 70,
          aiScoreReason: 'Contact-First Discovery — verified email available',
          discoveryData: {
            source: biz.source,
            rating: discovery.businessInfo.rating || biz.rating,
            reviewCount: discovery.businessInfo.reviewCount || biz.reviewCount,
            categories: biz.categories || biz.types || [],
            placeId: biz.placeId,
            yelpId: biz.yelpId,
            discoveredAt: new Date().toISOString(),
            emailSearchedAt: new Date().toISOString(),
            emailSearchResult: 'found',
            contactFirstDiscovery: true,
          },
        },
      })

      // Create contacts for owners with emails
      let bestEmail: string | null = null
      let bestSource: string | null = null

      for (const owner of discovery.owners) {
        if (!owner.firstName && !owner.lastName && !owner.email) continue

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

        if (owner.email && !bestEmail) {
          bestEmail = owner.email
          bestSource = owner.emailSource
        }
      }

      // If no owner had email, save the best hospitality email
      if (!bestEmail && verifiedHospitality.length > 0) {
        const best = verifiedHospitality[0]
        await prisma.prospectContact.create({
          data: {
            prospectId: prospect.id,
            firstName: '',
            lastName: '',
            email: best.email,
            title: best.role || 'General Contact',
            role: 'general',
            isDecisionMaker: false,
            emailConfidence: best.confidence,
            emailSource: 'hospitality_pattern',
          },
        })
        bestEmail = best.email
        bestSource = 'hospitality_pattern'
      }

      result.created++
      result.prospects.push({
        name: biz.name,
        website: biz.website,
        email: bestEmail,
        emailSource: bestSource,
        ownersFound: discovery.owners.length,
      })

      console.log(`[Contact-First] Created ${biz.name} with email: ${bestEmail}`)
    } catch (error: any) {
      console.error(`[Contact-First] Error processing ${biz.name}:`, error.message)
      result.warnings.push(`Error processing ${biz.name}: ${error.message}`)
    }
  }

  console.log(`[Contact-First] Done. ${result.created}/${result.discovered} businesses had emails and were imported`)

  return result
}
