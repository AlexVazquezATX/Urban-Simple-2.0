import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { captureMonthlySnapshot, priorMonth } from '@/lib/services/financial-snapshot'

// Vercel cron — runs the 1st of each month at 09:00 UTC and captures last
// month's totals for every company. Authenticates via CRON_SECRET.
async function handle(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { year, month } = priorMonth(new Date())

  const companies = await prisma.company.findMany({ select: { id: true, name: true } })

  const results = []
  for (const c of companies) {
    try {
      const r = await captureMonthlySnapshot({ companyId: c.id, periodYear: year, periodMonth: month })
      results.push({ companyName: c.name, ok: true, ...r })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[cron/financial-snapshot] failed for ${c.name}:`, error)
      results.push({ companyId: c.id, companyName: c.name, ok: false, error: message })
    }
  }

  return NextResponse.json({
    success: true,
    period: { year, month },
    companiesProcessed: results.length,
    results,
  })
}

export async function GET(request: NextRequest) {
  return handle(request)
}
export async function POST(request: NextRequest) {
  return handle(request)
}
