import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateBillingPreview } from '@/lib/billing/billing-engine'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BillingPreview } from '@/lib/billing/billing-types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDays(days: number[]): string {
  if (days.length === 0) return '-'
  if (days.length === 7) return 'Every day'
  const sorted = [...days].sort((a, b) => a - b)
  if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') return 'Mon–Fri'
  if (sorted.length === 6 && sorted.join(',') === '1,2,3,4,5,6') return 'Mon–Sat'
  return sorted.map(d => DAY_LABELS[d]).join(', ')
}

// GET /api/clients/[id]/billing-preview/export-pdf?year=2026&month=3
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
    const pdf = buildPdf(preview)

    const filename = `${preview.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_billing_${year}_${String(month).padStart(2, '0')}.pdf`

    return new NextResponse(Buffer.from(pdf.output('arraybuffer')), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Billing PDF export error:', error)
    if (error.message === 'Client not found') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to export billing PDF' }, { status: 500 })
  }
}

function buildPdf(preview: BillingPreview): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  // ── Header ────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Billing Preview', margin, 45)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(preview.clientName, margin, 62)
  doc.text(
    `${MONTH_NAMES[preview.month - 1]} ${preview.year}`,
    margin,
    76,
  )

  // Generated date (right aligned)
  const genText = `Generated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  doc.setFontSize(9)
  doc.text(genText, pageWidth - margin, 45, { align: 'right' })

  // ── Summary boxes ─────────────────────────────────────
  doc.setTextColor(0, 0, 0)
  const boxY = 94
  const boxH = 44
  const boxCount = 4
  const gap = 12
  const availW = pageWidth - margin * 2
  const boxW = (availW - gap * (boxCount - 1)) / boxCount

  const summaryItems = [
    { label: 'Subtotal', value: fmt(preview.subtotal) },
    { label: `Tax (${(preview.taxRate * 100).toFixed(2)}%)`, value: fmt(preview.taxAmount) },
    { label: 'Total', value: fmt(preview.total), highlight: true },
    {
      label: 'vs. Prior Month',
      value: preview.previousMonthTotal !== null && preview.explanation.deltaAmount !== null
        ? `${preview.explanation.deltaAmount >= 0 ? '+' : ''}${fmt(preview.explanation.deltaAmount)}`
        : 'N/A',
    },
  ]

  summaryItems.forEach((item, i) => {
    const x = margin + i * (boxW + gap)
    // Box background
    if (item.highlight) {
      doc.setFillColor(239, 246, 255) // ocean-50 equivalent
      doc.setDrawColor(186, 210, 240)
    } else {
      doc.setFillColor(250, 250, 248)
      doc.setDrawColor(215, 210, 200)
    }
    doc.roundedRect(x, boxY, boxW, boxH, 3, 3, 'FD')

    // Label
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 115, 105)
    doc.text(item.label, x + 8, boxY + 14)

    // Value
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(item.highlight ? 30 : 50, item.highlight ? 64 : 50, item.highlight ? 120 : 50)
    doc.text(item.value, x + 8, boxY + 34)
  })

  // ── Line items table ──────────────────────────────────
  doc.setTextColor(0, 0, 0)
  const tableStartY = boxY + boxH + 20

  const head = [['Facility', 'Category', 'Status', 'Schedule', 'Rate', 'Tax', 'Total', 'Notes']]

  const body = preview.lineItems.map(li => {
    const schedule = li.includedInTotal
      ? `${li.effectiveFrequency}x/wk · ${formatDays(li.effectiveDaysOfWeek)}`
      : '-'

    let rateStr = fmt(li.effectiveRate)
    if (li.isProRated) {
      rateStr += ` (${li.activeDays}/${li.scheduledDays} days)`
    }

    const notes: string[] = []
    if (li.isOverridden) notes.push('Override')
    if (li.isSeasonallyPaused) notes.push('Seasonal')
    if (li.isProRated) notes.push('Pro-rated')
    if (li.overrideNotes) notes.push(li.overrideNotes)

    return [
      li.locationName,
      li.category || '-',
      li.effectiveStatus.replace('_', ' '),
      schedule,
      rateStr,
      li.includedInTotal ? fmt(li.lineItemTax) : '-',
      li.includedInTotal ? fmt(li.lineItemTotal) : '$0.00',
      notes.join('; ') || '-',
    ]
  })

  // Totals row
  body.push([
    { content: `Total (${preview.activeFacilityCount} facilities)`, styles: { fontStyle: 'bold' } } as any,
    '', '', '', '',
    { content: fmt(preview.taxAmount), styles: { fontStyle: 'bold' } } as any,
    { content: fmt(preview.total), styles: { fontStyle: 'bold' } } as any,
    '',
  ])

  autoTable(doc, {
    startY: tableStartY,
    head,
    body,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [245, 243, 240],
      textColor: [80, 75, 70],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 'auto' }, // Facility
      4: { halign: 'right' },  // Rate
      5: { halign: 'right' },  // Tax
      6: { halign: 'right' },  // Total
    },
    alternateRowStyles: { fillColor: [252, 252, 250] },
    didParseCell: (data) => {
      // Style the last (totals) row
      if (data.row.index === body.length - 1 && data.section === 'body') {
        data.cell.styles.fillColor = [245, 243, 240]
        data.cell.styles.fontStyle = 'bold'
      }
      // Dim non-included rows
      const rowIdx = data.row.index
      if (data.section === 'body' && rowIdx < preview.lineItems.length) {
        const li = preview.lineItems[rowIdx]
        if (!li.includedInTotal) {
          data.cell.styles.textColor = [170, 165, 160]
        }
      }
    },
  })

  // ── Explanation notes ─────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 200
  let noteY = finalY + 20

  const { explanation } = preview
  const hasNotes =
    explanation.seasonallyPaused.length > 0 ||
    explanation.pausedFacilities.length > 0 ||
    explanation.overrides.length > 0 ||
    explanation.deltaReason

  if (hasNotes) {
    // Check if we need a new page
    if (noteY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      noteY = 40
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 55, 50)
    doc.text('Billing Notes', margin, noteY)
    noteY += 14

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 95, 90)

    if (explanation.seasonallyPaused.length > 0) {
      doc.text(`Seasonally paused: ${explanation.seasonallyPaused.join(', ')}`, margin, noteY)
      noteY += 12
    }
    if (explanation.pausedFacilities.length > 0) {
      doc.text(`Paused: ${explanation.pausedFacilities.join(', ')}`, margin, noteY)
      noteY += 12
    }
    for (const o of explanation.overrides) {
      doc.text(`• ${o}`, margin + 6, noteY)
      noteY += 12
    }
    if (explanation.deltaReason) {
      doc.text(`Month-over-month: ${explanation.deltaReason}`, margin, noteY)
      noteY += 12
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 155, 150)
    const footY = doc.internal.pageSize.getHeight() - 20
    doc.text(
      `${preview.clientName} — ${MONTH_NAMES[preview.month - 1]} ${preview.year} Billing Preview`,
      margin,
      footY,
    )
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, footY, { align: 'right' })
  }

  return doc
}
