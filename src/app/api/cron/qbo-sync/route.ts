import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncFromQbo } from '@/lib/qbo/sync'

// Vercel cron — daily pull of invoices and payments from QuickBooks for every
// connected company. Authenticates via CRON_SECRET.
async function handle(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connections = await prisma.qBOConnection.findMany({
    where: { isActive: true },
    select: { companyId: true },
  })

  const results = []
  for (const c of connections) {
    try {
      const r = await syncFromQbo(c.companyId)
      results.push({ companyId: c.companyId, ok: true, ...r })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[cron/qbo-sync] failed for ${c.companyId}:`, error)
      results.push({ companyId: c.companyId, ok: false, error: message })
    }
  }

  return NextResponse.json({
    success: true,
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
