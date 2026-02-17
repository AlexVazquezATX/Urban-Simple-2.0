import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { generateBillingPreview } from '@/lib/billing/billing-engine'
import type { FacilityLineItem } from '@/lib/billing/billing-types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getMonthDates(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startPad = firstDay.getDay()
  const totalDays = lastDay.getDate()

  const cells: Array<{ dayOfMonth: number; dayOfWeek: number } | null> = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month - 1, d)
    cells.push({ dayOfMonth: d, dayOfWeek: date.getDay() })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default async function PrintSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const sp = await searchParams
  const now = new Date()
  const year = sp.year ? parseInt(sp.year, 10) : now.getFullYear()
  const month = sp.month ? parseInt(sp.month, 10) : now.getMonth() + 1

  const preview = await generateBillingPreview(id, user.companyId, year, month)

  // Build schedule by DOW
  const scheduleByDow = new Map<number, FacilityLineItem[]>()
  for (let dow = 0; dow < 7; dow++) scheduleByDow.set(dow, [])
  for (const li of preview.lineItems) {
    if (!li.includedInTotal) continue
    for (const dow of li.effectiveDaysOfWeek) {
      scheduleByDow.get(dow)?.push(li)
    }
  }

  const monthCells = getMonthDates(year, month)
  const inactiveFacilities = preview.lineItems.filter(li => !li.includedInTotal)

  return (
    <html>
      <head>
        <title>{preview.clientName} — {MONTH_NAMES[month - 1]} {year} Schedule</title>
        <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      </head>
      <body>
        <div className="print-page">
          {/* Header */}
          <div className="header">
            <div>
              <h1>{preview.clientName}</h1>
              <p className="subtitle">
                {MONTH_NAMES[month - 1]} {year} Cleaning Schedule
              </p>
            </div>
            <div className="header-right">
              <p>{preview.activeFacilityCount} active facilities</p>
              <p className="generated">
                Generated {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Calendar grid */}
          <table className="calendar">
            <thead>
              <tr>
                {DAY_HEADERS.map((day) => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(monthCells.length / 7) }, (_, weekIdx) => (
                <tr key={weekIdx}>
                  {monthCells.slice(weekIdx * 7, weekIdx * 7 + 7).map((cell, cellIdx) => {
                    if (!cell) {
                      return <td key={cellIdx} className="empty" />
                    }

                    const facilities = scheduleByDow.get(cell.dayOfWeek) || []
                    const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6

                    return (
                      <td key={cellIdx} className={isWeekend ? 'weekend' : ''}>
                        <div className="day-number">{cell.dayOfMonth}</div>
                        {facilities.length > 0 ? (
                          <div className="facility-list">
                            {facilities.map((f, i) => (
                              <div key={i} className={`facility ${f.isOverridden ? 'override' : ''}`}>
                                {f.locationName}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="no-service">No service</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Facility schedule summary */}
          <div className="summary-section">
            <h2>Facility Schedule Summary</h2>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Category</th>
                  <th>Frequency</th>
                  <th>Days</th>
                  <th>Monthly Rate</th>
                </tr>
              </thead>
              <tbody>
                {preview.lineItems
                  .filter(li => li.includedInTotal)
                  .map((li) => (
                    <tr key={li.facilityProfileId}>
                      <td>
                        {li.locationName}
                        {li.isOverridden && <span className="badge override-badge">Override</span>}
                      </td>
                      <td>{li.category || '-'}</td>
                      <td>{li.effectiveFrequency}x/week</td>
                      <td>
                        {li.effectiveDaysOfWeek.length === 0
                          ? '-'
                          : li.effectiveDaysOfWeek.length === 7
                            ? 'Every day'
                            : [...li.effectiveDaysOfWeek]
                                .sort((a, b) => a - b)
                                .map(d => DAY_HEADERS[d])
                                .join(', ')}
                      </td>
                      <td className="amount">
                        ${li.lineItemTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        {li.isProRated && (
                          <span className="badge prorate-badge">
                            {li.activeDays}/{li.scheduledDays} days
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                <tr className="total-row">
                  <td colSpan={4}>Total ({preview.activeFacilityCount} facilities)</td>
                  <td className="amount">
                    ${preview.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Inactive facilities */}
          {inactiveFacilities.length > 0 && (
            <div className="inactive-section">
              <h3>Not Scheduled This Month</h3>
              <div className="inactive-list">
                {inactiveFacilities.map((f) => (
                  <span key={f.facilityProfileId} className="inactive-badge">
                    {f.locationName} ({f.effectiveStatus.replace('_', ' ').toLowerCase()})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            {preview.clientName} — {MONTH_NAMES[month - 1]} {year} Schedule
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `window.onload = function() { window.print(); }` }} />
      </body>
    </html>
  )
}

const printStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #2d2a26;
    font-size: 10px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-page {
    max-width: 11in;
    margin: 0 auto;
    padding: 0.4in;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e8e4df;
  }

  .header h1 {
    font-size: 18px;
    font-weight: 600;
    color: #2d2a26;
  }

  .header .subtitle {
    font-size: 12px;
    color: #78736c;
    margin-top: 2px;
  }

  .header-right {
    text-align: right;
    font-size: 11px;
    color: #78736c;
  }

  .header-right .generated {
    font-size: 9px;
    margin-top: 2px;
  }

  /* Calendar table */
  .calendar {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    table-layout: fixed;
  }

  .calendar th {
    background: #f5f3f0;
    padding: 4px;
    text-align: center;
    font-size: 9px;
    font-weight: 600;
    color: #78736c;
    border: 1px solid #e8e4df;
  }

  .calendar td {
    border: 1px solid #e8e4df;
    vertical-align: top;
    padding: 3px;
    height: 72px;
    width: 14.28%;
  }

  .calendar td.empty {
    background: #fafaf8;
  }

  .calendar td.weekend {
    background: #fafaf8;
  }

  .day-number {
    font-size: 10px;
    font-weight: 600;
    color: #4a4540;
    margin-bottom: 2px;
  }

  .facility-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .facility {
    font-size: 7px;
    color: #4a4540;
    padding: 1px 2px;
    background: #f0fdf4;
    border-radius: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .facility.override {
    background: #fff7ed;
    color: #9a3412;
  }

  .no-service {
    font-size: 8px;
    color: #c5c0ba;
    font-style: italic;
  }

  /* Summary table */
  .summary-section {
    margin-top: 16px;
    page-break-inside: avoid;
  }

  .summary-section h2 {
    font-size: 12px;
    font-weight: 600;
    color: #2d2a26;
    margin-bottom: 8px;
  }

  .summary-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
  }

  .summary-table th {
    background: #f5f3f0;
    padding: 5px 8px;
    text-align: left;
    font-weight: 600;
    color: #78736c;
    border-bottom: 1px solid #e8e4df;
  }

  .summary-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #f0eeea;
    color: #4a4540;
  }

  .summary-table .amount {
    text-align: right;
    font-family: 'SF Mono', 'Consolas', monospace;
  }

  .summary-table .total-row {
    background: #f5f3f0;
    font-weight: 600;
  }

  .summary-table .total-row td {
    border-bottom: 2px solid #e8e4df;
    padding: 6px 8px;
  }

  .badge {
    display: inline-block;
    font-size: 7px;
    padding: 1px 4px;
    border-radius: 2px;
    margin-left: 4px;
    font-weight: 500;
  }

  .override-badge {
    background: #fff7ed;
    color: #c2410c;
    border: 1px solid #fed7aa;
  }

  .prorate-badge {
    background: #fff7ed;
    color: #c2410c;
    border: 1px solid #fed7aa;
  }

  /* Inactive section */
  .inactive-section {
    margin-top: 12px;
    page-break-inside: avoid;
  }

  .inactive-section h3 {
    font-size: 10px;
    font-weight: 600;
    color: #78736c;
    margin-bottom: 4px;
  }

  .inactive-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .inactive-badge {
    font-size: 8px;
    padding: 2px 6px;
    border-radius: 2px;
    background: #f5f3f0;
    color: #78736c;
    border: 1px solid #e8e4df;
  }

  /* Footer */
  .footer {
    margin-top: 20px;
    padding-top: 8px;
    border-top: 1px solid #e8e4df;
    font-size: 8px;
    color: #a39e97;
    text-align: center;
  }

  @media print {
    body { margin: 0; }
    .print-page { padding: 0.3in; max-width: 100%; }

    @page {
      size: landscape;
      margin: 0.25in;
    }
  }
`
