import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateBillingPreview } from '@/lib/billing/billing-engine'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// GET /api/clients/[id]/billing-preview/export-qb?year=2026&month=3
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

    // QuickBooks-compatible invoice CSV format
    // Uses standard QB Online invoice import columns
    const rows: string[] = []

    // Header row — matches QB Online CSV import spec
    rows.push([
      'InvoiceNo',
      'Customer',
      'InvoiceDate',
      'DueDate',
      'ItemDescription',
      'ItemQuantity',
      'ItemRate',
      'ItemAmount',
      'TaxCode',
      'Memo',
    ].join(','))

    const invoiceDate = `${String(month).padStart(2, '0')}/01/${year}`
    // Due date = last day of the month
    const lastDay = new Date(year, month, 0).getDate()
    const dueDate = `${String(month).padStart(2, '0')}/${String(lastDay).padStart(2, '0')}/${year}`
    const invoiceNo = `US-${year}${String(month).padStart(2, '0')}`
    const customerName = preview.clientName
    const memo = `${MONTH_NAMES[month - 1]} ${year} Cleaning Services`

    // One line per active facility
    for (const li of preview.lineItems) {
      if (!li.includedInTotal) continue

      let desc = `${li.locationName} — Monthly Cleaning`
      if (li.category) desc += ` (${li.category})`
      if (li.isProRated) {
        desc += ` [Pro-rated: ${li.activeDays}/${li.scheduledDays} days]`
      }
      if (li.overrideNotes) {
        desc += ` — ${li.overrideNotes}`
      }

      rows.push([
        csvEscape(invoiceNo),
        csvEscape(customerName),
        invoiceDate,
        dueDate,
        csvEscape(desc),
        '1',
        li.lineItemTotal.toFixed(2),
        li.lineItemTotal.toFixed(2),
        li.taxBehavior === 'TAX_INCLUDED' ? 'NON' : 'TAX',
        csvEscape(memo),
      ].join(','))
    }

    // Tax line (if any)
    if (preview.taxAmount > 0) {
      rows.push([
        csvEscape(invoiceNo),
        csvEscape(customerName),
        invoiceDate,
        dueDate,
        csvEscape(`Sales Tax (${(preview.taxRate * 100).toFixed(2)}%)`),
        '1',
        preview.taxAmount.toFixed(2),
        preview.taxAmount.toFixed(2),
        'NON', // tax line itself isn't taxed
        csvEscape(memo),
      ].join(','))
    }

    const csv = rows.join('\n')
    const filename = `${preview.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_QB_invoice_${year}_${String(month).padStart(2, '0')}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('QuickBooks export error:', error)
    if (error.message === 'Client not found') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to export QuickBooks CSV' }, { status: 500 })
  }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
