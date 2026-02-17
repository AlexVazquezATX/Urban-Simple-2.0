import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateBillingPreview } from '@/lib/billing/billing-engine'

// GET /api/clients/[id]/billing-preview/export?year=2026&month=3
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)

    const now = new Date()
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10)
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10)

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Month must be between 1 and 12' }, { status: 400 })
    }

    const preview = await generateBillingPreview(id, user.companyId, year, month)

    // Build CSV
    const rows: string[] = []
    rows.push([
      'Facility',
      'Category',
      'Status',
      'Monthly Rate',
      'Frequency',
      'Tax Behavior',
      'Line Tax',
      'Line Total',
      'Included',
      'Override',
      'Pro-Rated',
      'Scheduled Days',
      'Active Days',
      'Pause Range',
      'Notes',
    ].join(','))

    for (const li of preview.lineItems) {
      const pauseRange = li.pauseStartDay && li.pauseEndDay
        ? `${li.pauseStartDay}-${li.pauseEndDay}`
        : ''
      rows.push([
        csvEscape(li.locationName),
        csvEscape(li.category || ''),
        li.effectiveStatus,
        li.effectiveRate.toFixed(2),
        `${li.effectiveFrequency}x/week`,
        li.taxBehavior,
        li.lineItemTax.toFixed(2),
        li.lineItemTotal.toFixed(2),
        li.includedInTotal ? 'Yes' : 'No',
        li.isOverridden ? 'Yes' : 'No',
        li.isProRated ? 'Yes' : 'No',
        li.scheduledDays !== null ? String(li.scheduledDays) : '',
        li.activeDays !== null ? String(li.activeDays) : '',
        pauseRange,
        csvEscape(li.overrideNotes || ''),
      ].join(','))
    }

    // Summary rows
    rows.push('')
    rows.push(`Subtotal,,,,,,,$${preview.subtotal.toFixed(2)}`)
    rows.push(`Tax (${(preview.taxRate * 100).toFixed(2)}%),,,,,,,$${preview.taxAmount.toFixed(2)}`)
    rows.push(`Total,,,,,,,$${preview.total.toFixed(2)}`)

    if (preview.previousMonthTotal !== null) {
      rows.push(`Previous Month,,,,,,,$${preview.previousMonthTotal.toFixed(2)}`)
      if (preview.explanation.deltaAmount !== null) {
        rows.push(`Delta,,,,,,,$${preview.explanation.deltaAmount.toFixed(2)}`)
      }
    }

    const csv = rows.join('\n')
    const filename = `${preview.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_billing_${year}_${String(month).padStart(2, '0')}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Billing export error:', error)
    if (error.message === 'Client not found') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to export billing preview' }, { status: 500 })
  }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
