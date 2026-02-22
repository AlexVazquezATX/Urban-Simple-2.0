import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runAgentCycle } from '@/lib/services/growth-agent'

export const runtime = 'nodejs'
export const maxDuration = 300

// GET handler for Vercel Cron
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all companies with enabled agent configs
  const configs = await prisma.growthAgentConfig.findMany({
    where: {
      isEnabled: true,
      pausedAt: null,
    },
    select: { companyId: true },
  })

  const allResults = []

  for (const { companyId } of configs) {
    try {
      const result = await runAgentCycle(companyId)
      allResults.push({ ...result, success: true })
    } catch (error: any) {
      allResults.push({
        companyId,
        success: false,
        error: error.message || 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    success: true,
    companiesProcessed: configs.length,
    results: allResults,
    timestamp: new Date().toISOString(),
  })
}

// POST handler for manual triggers (reuses GET logic)
export async function POST(request: NextRequest) {
  return GET(request)
}
