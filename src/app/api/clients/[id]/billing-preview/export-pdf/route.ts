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

    const hideTax = searchParams.get('hideTax') === '1'
    const preview = await generateBillingPreview(id, user.companyId, year, month)
    const pdf = buildPdf(preview, hideTax)

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

function buildPdf(preview: BillingPreview, hideTax = false): jsPDF {
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
  const gap = 12
  const availW = pageWidth - margin * 2

  const summaryItems: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: 'Subtotal', value: fmt(preview.subtotal) },
  ]
  if (!hideTax) {
    summaryItems.push({ label: `Tax (${(preview.taxRate * 100).toFixed(2)}%)`, value: fmt(preview.taxAmount) })
  }
  summaryItems.push({ label: 'Total', value: fmt(hideTax ? preview.subtotal : preview.total), highlight: true })
  summaryItems.push({
    label: 'vs. Prior Month',
    value: preview.previousMonthTotal !== null && preview.explanation.deltaAmount !== null
      ? `${preview.explanation.deltaAmount >= 0 ? '+' : ''}${fmt(preview.explanation.deltaAmount)}`
      : 'N/A',
  })

  const boxCount = summaryItems.length
  const boxW = (availW - gap * (boxCount - 1)) / boxCount

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

  const head = hideTax
    ? [['Facility', 'Category', 'Status', 'Schedule', 'Rate', 'Total', 'Notes']]
    : [['Facility', 'Category', 'Status', 'Schedule', 'Rate', 'Tax', 'Total', 'Notes']]

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

    if (hideTax) {
      return [
        li.locationName,
        li.category || '-',
        li.effectiveStatus.replace('_', ' '),
        schedule,
        rateStr,
        li.includedInTotal ? fmt(li.lineItemTotal) : '$0.00',
        notes.join('; ') || '-',
      ]
    }

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

  // Facility subtotal row
  const facilitySubtotal = preview.lineItems.reduce((s, li) => s + li.lineItemTotal, 0)
  const facilityTax = preview.lineItems.reduce((s, li) => s + li.lineItemTax, 0)

  if (hideTax) {
    body.push([
      { content: `Facility Subtotal (${preview.activeFacilityCount} active)`, styles: { fontStyle: 'bold' } } as any,
      '', '', '', '',
      { content: fmt(facilitySubtotal), styles: { fontStyle: 'bold' } } as any,
      '',
    ])
  } else {
    body.push([
      { content: `Facility Subtotal (${preview.activeFacilityCount} active)`, styles: { fontStyle: 'bold' } } as any,
      '', '', '', '',
      { content: fmt(facilityTax), styles: { fontStyle: 'bold' } } as any,
      { content: fmt(facilitySubtotal), styles: { fontStyle: 'bold' } } as any,
      '',
    ])
  }

  const totalColIdx = hideTax ? 5 : 6
  const taxColIdx = hideTax ? -1 : 5

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
      ...(hideTax ? {} : { 5: { halign: 'right' } }),  // Tax (only if shown)
      [totalColIdx]: { halign: 'right' },  // Total
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

  // ── Service Line Items table ────────────────────────
  if (preview.serviceLineItems.length > 0) {
    let serviceTableY = (doc as any).lastAutoTable?.finalY || tableStartY + 200
    serviceTableY += 14

    const serviceHead = hideTax
      ? [['Description', 'Facility', 'Qty', 'Rate', 'Total', 'Notes']]
      : [['Description', 'Facility', 'Qty', 'Rate', 'Tax', 'Total', 'Notes']]

    const serviceBody: any[][] = preview.serviceLineItems.map(si => {
      if (hideTax) {
        return [
          si.description,
          si.locationName || '-',
          si.quantity !== 1 ? String(si.quantity) : '1',
          fmt(si.unitRate),
          fmt(si.lineItemTotal),
          si.notes || '-',
        ]
      }
      return [
        si.description,
        si.locationName || '-',
        si.quantity !== 1 ? String(si.quantity) : '1',
        fmt(si.unitRate),
        fmt(si.lineItemTax),
        fmt(si.lineItemTotal),
        si.notes || '-',
      ]
    })

    const serviceTax = preview.serviceLineItems.reduce((s, si) => s + si.lineItemTax, 0)
    const serviceTotal = preview.serviceLineItems.reduce((s, si) => s + si.lineItemTotal, 0)

    if (hideTax) {
      serviceBody.push([
        { content: `Service Subtotal (${preview.serviceLineItems.length} items)`, styles: { fontStyle: 'bold' } } as any,
        '', '', '',
        { content: fmt(serviceTotal), styles: { fontStyle: 'bold' } } as any,
        '',
      ])
    } else {
      serviceBody.push([
        { content: `Service Subtotal (${preview.serviceLineItems.length} items)`, styles: { fontStyle: 'bold' } } as any,
        '', '', '',
        { content: fmt(serviceTax), styles: { fontStyle: 'bold' } } as any,
        { content: fmt(serviceTotal), styles: { fontStyle: 'bold' } } as any,
        '',
      ])
    }

    // Check if we need a new page
    if (serviceTableY > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage()
      serviceTableY = 40
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 55, 50)
    doc.text('Service Line Items', margin, serviceTableY)

    autoTable(doc, {
      startY: serviceTableY + 6,
      head: serviceHead,
      body: serviceBody,
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
      columnStyles: hideTax
        ? {
            0: { cellWidth: 'auto' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
          }
        : {
            0: { cellWidth: 'auto' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
          },
      alternateRowStyles: { fillColor: [252, 252, 250] },
      didParseCell: (data) => {
        if (data.row.index === serviceBody.length - 1 && data.section === 'body') {
          data.cell.styles.fillColor = [245, 243, 240]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
  }

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
