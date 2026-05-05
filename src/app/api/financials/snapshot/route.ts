import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { canSeeFinancials } from '@/lib/financials'
import { captureMonthlySnapshot } from '@/lib/services/financial-snapshot'

// POST /api/financials/snapshot — admin-triggered snapshot capture.
// Used by the dashboard "Snapshot now" button to backfill or re-record
// the current month's totals on demand.
//
// Body: { year?: number, month?: number } — defaults to current month.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canSeeFinancials(user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const now = new Date()
  const year = Number.isFinite(body.year) ? Number(body.year) : now.getFullYear()
  const month = Number.isFinite(body.month) ? Number(body.month) : now.getMonth() + 1

  if (year < 2020 || year > 2100 || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year/month' }, { status: 400 })
  }

  const result = await captureMonthlySnapshot({
    companyId: user.companyId,
    periodYear: year,
    periodMonth: month,
  })

  return NextResponse.json(result)
}
