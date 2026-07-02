import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { automatePipelineStage, detectHotProspects } from '@/lib/ai/pipeline-automator'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

/**
 * Automate pipeline stage transitions.
 *
 * GET  — called by the Vercel cron (no body). Fail-closed CRON_SECRET auth.
 *        Runs automation for ALL companies.
 * POST — manual/API trigger for a single company (companyId in the body).
 *        Auth via CRON_SECRET bearer OR API key.
 */

/**
 * Run stage automation + hot-prospect detection for a single company.
 */
async function runAutomationForCompany(companyId: string) {
  // Get all prospects that might need stage updates
  const prospects = await prisma.prospect.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: { in: ['new', 'contacted', 'engaged', 'qualified'] },
    },
    select: {
      id: true,
    },
  })

  const results = []

  // Automate stage transitions for each prospect
  for (const prospect of prospects) {
    try {
      await automatePipelineStage(prospect.id)
      results.push({
        prospectId: prospect.id,
        success: true,
      })
    } catch (error) {
      console.error(`Error automating pipeline for prospect ${prospect.id}:`, error)
      results.push({
        prospectId: prospect.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Detect hot prospects
  const hotProspects = await detectHotProspects(companyId)

  return { results, hotProspects }
}

export async function GET(request: NextRequest) {
  try {
    // Fail closed: if CRON_SECRET is unset the endpoint must NOT run
    // unauthenticated (every other cron uses this posture).
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Pipeline automate cron called without valid authorization')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run automation for every company (cron has no body / companyId).
    const companies = await prisma.company.findMany({ select: { id: true } })

    let prospectsProcessed = 0
    let hotProspectsDetected = 0
    const perCompany = []

    for (const company of companies) {
      try {
        const { results, hotProspects } = await runAutomationForCompany(company.id)
        prospectsProcessed += results.length
        hotProspectsDetected += hotProspects.length
        perCompany.push({
          companyId: company.id,
          prospectsProcessed: results.length,
          hotProspectsDetected: hotProspects.length,
        })
      } catch (error) {
        console.error(`Error automating pipeline for company ${company.id}:`, error)
        perCompany.push({
          companyId: company.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      companiesProcessed: companies.length,
      prospectsProcessed,
      hotProspectsDetected,
      perCompany,
    })
  } catch (error) {
    console.error('Error automating pipeline (cron):', error)
    return NextResponse.json(
      { error: 'Failed to automate pipeline' },
      { status: 500 }
    )
  }
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

    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID required' },
        { status: 400 }
      )
    }

    const { results, hotProspects } = await runAutomationForCompany(companyId)

    return NextResponse.json({
      success: true,
      prospectsProcessed: results.length,
      hotProspectsDetected: hotProspects.length,
      results,
      hotProspects,
    })
  } catch (error) {
    console.error('Error automating pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to automate pipeline' },
      { status: 500 }
    )
  }
}
