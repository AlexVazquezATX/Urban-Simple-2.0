import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getOperationalWindow } from '@/lib/ops/field'
import { generateAssociateShifts } from '@/lib/operations/associate-shift-generator'

// POST /api/operations/associate-shifts — fill associate shifts from
// assignment schedules for the next N nights (default 14). Idempotent.
// Body: { days?: number, assignmentId?: string }
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = (await request.json().catch(() => ({}))) as { days?: number; assignmentId?: string }
  const days = Math.min(Math.max(Number(body.days) || 14, 1), 35)
  try {
    const { today } = await getOperationalWindow(user.companyId, user.branchId)
    const result = await generateAssociateShifts({
      companyId: user.companyId,
      fromDate: today,
      days,
      assignmentId: body.assignmentId,
    })
    return NextResponse.json({ success: true, days, ...result })
  } catch (error) {
    console.error('[associate-shifts] generate failed:', error)
    return NextResponse.json({ error: 'Failed to generate shifts' }, { status: 500 })
  }
}
