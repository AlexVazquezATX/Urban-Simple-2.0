import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateRecurringInvoices } from '../../../../../scripts/generate-recurring-invoices'

// POST /api/billing/generate-invoices - Manually trigger invoice generation
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and managers can generate invoices
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { dryRun = false, billingDay, targetDate } = body

    const result = await generateRecurringInvoices({
      dryRun,
      billingDay,
      targetDate: targetDate ? new Date(targetDate) : undefined,
    })

    return NextResponse.json({
      success: true,
      message: dryRun
        ? `Would generate ${result.generated} invoices`
        : `Generated ${result.generated} invoices`,
      ...result,
    })
  } catch (error) {
    console.error('Error generating invoices:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoices' },
      { status: 500 }
    )
  }
}
