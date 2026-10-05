import { NextRequest, NextResponse } from 'next/server'
import { drainLeadDeliveries } from '@/lib/leads/delivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/cron/lead-deliveries - authenticated delivery worker; no lead data returned.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const results = await drainLeadDeliveries()
    return NextResponse.json({ ok: results.failed === 0, ...results }, { status: results.failed ? 503 : 200 })
  } catch {
    console.error('[leads] delivery worker failed')
    return NextResponse.json({ ok: false, error: 'Delivery worker unavailable' }, { status: 503 })
  }
}
