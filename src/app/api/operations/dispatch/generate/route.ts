import { NextRequest, NextResponse } from 'next/server'
import { addDays, endOfDay, startOfDay } from 'date-fns'
import { getCurrentUser } from '@/lib/auth'
import { generateDispatchForCompany } from '@/lib/operations/dispatch-generator'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Bulk generation rewrites routes for the entire branch/company. Reserve to
    // ADMIN and SUPER_ADMIN so individual managers can't unintentionally clobber
    // each other's schedules.
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const rangeStart = body.rangeStart ? startOfDay(new Date(body.rangeStart)) : startOfDay(new Date())
    const rangeEnd = body.rangeEnd ? endOfDay(new Date(body.rangeEnd)) : endOfDay(addDays(rangeStart, 6))

    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    const result = await generateDispatchForCompany({
      companyId: user.companyId,
      branchId: user.branchId,
      rangeStart,
      rangeEnd,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    console.error('Dispatch generation failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate dispatch routes',
      },
      { status: 500 }
    )
  }
}
