import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { scoreProspect } from '@/lib/ai/prospect-scorer'

/**
 * Run scheduled discovery jobs.
 *
 * GET  — called by the Vercel cron nightly (no body). Delegates to POST, which
 *        fails closed on the CRON_SECRET bearer check (see POST auth below).
 * POST — manual/API trigger. Auth via CRON_SECRET bearer OR API key.
 */
export async function GET(request: NextRequest) {
  return POST(request)
}

export async function POST(request: NextRequest) {
  try {
    // Verify auth: cron secret OR API key
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`
    const apiKeyUser = !isCron ? await getAuthenticatedUser(request) : null

    if (!isCron && !apiKeyUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Find all recurring discovery jobs that are due
    const dueJobs = await prisma.aIDiscoveryJob.findMany({
      where: {
        isRecurring: true,
        status: { in: ['pending', 'completed'] },
        OR: [
          { nextRunAt: { lte: now } },
          { nextRunAt: null },
        ],
      },
      include: {
        company: true,
        createdBy: true,
      },
    })

    const results = []

    for (const job of dueJobs) {
      try {
        // Update job status
        await prisma.aIDiscoveryJob.update({
          where: { id: job.id },
          data: {
            status: 'running',
            startedAt: new Date(),
          },
        })

        // Run discovery. NOTE: this is currently a documented no-op stub — the
        // real Places/Yelp integration is not built yet, so it always returns
        // zero prospects. The job still completes cleanly (0 found / 0 added)
        // instead of erroring or looking successful-with-data.
        const searchCriteria = job.searchCriteria as any
        const discoveredProspects = await runDiscovery(searchCriteria, job.sources)

        // Score and filter prospects
        const scoredProspects = []
        for (const prospectData of discoveredProspects) {
          try {
            const score = await scoreProspect(prospectData)
            
            // Only import prospects with score >= 50
            if (score.score >= 50) {
              scoredProspects.push({
                ...prospectData,
                aiScore: score.score,
                aiScoreReason: score.reasoning,
                priority: score.priority,
              })
            }
          } catch (error) {
            console.error('Error scoring prospect:', error)
          }
        }

        // Import prospects (deduplicate first)
        let imported = 0
        for (const prospectData of scoredProspects) {
          try {
            // Check for duplicates
            const existing = await prisma.prospect.findFirst({
              where: {
                companyId: job.companyId,
                companyName: {
                  equals: prospectData.companyName,
                  mode: 'insensitive',
                },
              },
            })

            if (!existing) {
              await prisma.prospect.create({
                data: {
                  companyId: job.companyId,
                  companyName: prospectData.companyName,
                  businessType: prospectData.businessType,
                  industry: prospectData.industry,
                  address: prospectData.address,
                  website: prospectData.website,
                  phone: prospectData.phone,
                  priceLevel: prospectData.priceLevel,
                  source: 'ai_discovery',
                  sourceDetail: `Auto-discovery: ${job.name}`,
                  discoveryData: prospectData.discoveryData,
                  aiScore: prospectData.aiScore,
                  aiScoreReason: prospectData.aiScoreReason,
                  priority: prospectData.priority,
                  status: 'new',
                },
              })
              imported++
            }
          } catch (error) {
            console.error('Error importing prospect:', error)
          }
        }

        // Calculate next run time (daily by default)
        const nextRun = new Date(now)
        nextRun.setDate(nextRun.getDate() + 1)
        nextRun.setHours(2, 0, 0, 0) // Run at 2 AM

        // Update job
        await prisma.aIDiscoveryJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            resultsFound: discoveredProspects.length,
            resultsAdded: imported,
            nextRunAt: nextRun,
            progress: 100,
          },
        })

        results.push({
          jobId: job.id,
          jobName: job.name,
          found: discoveredProspects.length,
          imported,
          success: true,
        })
      } catch (error) {
        console.error(`Error running discovery job ${job.id}:`, error)
        
        await prisma.aIDiscoveryJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        })

        results.push({
          jobId: job.id,
          jobName: job.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      jobsProcessed: results.length,
      results,
    })
  } catch (error) {
    console.error('Error running discovery jobs:', error)
    return NextResponse.json(
      { error: 'Failed to run discovery jobs' },
      { status: 500 }
    )
  }
}

/**
 * Discovery search — EXPLICIT NO-OP STUB.
 *
 * Real prospect discovery (Google Places API, Yelp API, "Best of" web scraping)
 * is intentionally out of scope. This function always returns an empty list so
 * scheduled jobs complete cleanly with 0 results rather than erroring. Wire the
 * real integrations here when they are built.
 */
async function runDiscovery(
  criteria: any,
  sources: string[]
): Promise<any[]> {
  console.log(
    '[DISCOVERY] Stub no-op — no discovery provider integrated; returning 0 prospects.',
    { criteria, sources }
  )
  return []
}
