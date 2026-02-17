import { prisma } from '@/lib/db'
import type { BillingPreview, FacilityLineItem, BillingExplanation } from './billing-types'

const MONTH_LABELS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Generate a billing preview for a client for a given month.
 *
 * Resolution order per facility:
 *  1. MonthlyOverride (rate, status, frequency, days, date-range pause) — highest priority
 *  2. SeasonalRule (active/paused months) — checked if seasonalRulesEnabled
 *  3. FacilityProfile defaults (rate, status, frequency, days)
 */
export async function generateBillingPreview(
  clientId: string,
  companyId: string,
  year: number,
  month: number, // 1-12
): Promise<BillingPreview> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    include: {
      facilityProfiles: {
        include: {
          location: { select: { id: true, name: true, isActive: true } },
          seasonalRules: { where: { isActive: true } },
          monthlyOverrides: { where: { year, month } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  const clientTaxRate = client.taxRate ? Number(client.taxRate) : 0
  const lineItems: FacilityLineItem[] = []
  const explanation: BillingExplanation = {
    activeFacilities: [],
    pausedFacilities: [],
    seasonallyPaused: [],
    pendingApproval: [],
    closedFacilities: [],
    overrides: [],
    deltaAmount: null,
    deltaReason: null,
  }

  for (const fp of client.facilityProfiles) {
    const locationName = fp.location.name
    const override = fp.monthlyOverrides[0] || null // unique per month

    // --- Determine effective values ---
    const effectiveRate = override?.overrideRate != null
      ? Number(override.overrideRate)
      : Number(fp.defaultMonthlyRate)

    const effectiveFrequency = override?.overrideFrequency != null
      ? override.overrideFrequency
      : fp.normalFrequencyPerWeek

    const effectiveDaysOfWeek = override?.overrideDaysOfWeek?.length
      ? override.overrideDaysOfWeek
      : fp.normalDaysOfWeek

    // --- Determine effective status ---
    let effectiveStatus = fp.status as string
    let isSeasonallyPaused = false
    let isOverridden = !!override

    // Monthly override status takes highest priority
    if (override?.overrideStatus) {
      if (override.overrideStatus === 'PAUSED') {
        effectiveStatus = 'PAUSED'
      } else if (override.overrideStatus === 'CANCELLED') {
        effectiveStatus = 'CLOSED'
      } else {
        effectiveStatus = 'ACTIVE'
      }
    }
    // Seasonal rules checked second (only if no override status and facility is normally active)
    else if (fp.seasonalRulesEnabled && effectiveStatus === 'ACTIVE') {
      const seasonallyActive = isMonthActiveBySeasonalRules(fp.seasonalRules, year, month)
      if (!seasonallyActive) {
        effectiveStatus = 'SEASONAL_PAUSED'
        isSeasonallyPaused = true
      }
    }

    // --- Determine if included in billing total ---
    const includedInTotal = effectiveStatus === 'ACTIVE'

    // --- Pro-rating for date-range pause ---
    const pauseStartDay = override?.pauseStartDay ?? null
    const pauseEndDay = override?.pauseEndDay ?? null
    const hasDateRangePause = includedInTotal && pauseStartDay !== null && pauseEndDay !== null

    let scheduledDays: number | null = null
    let activeDays: number | null = null
    let isProRated = false
    let lineItemTotal = 0

    if (includedInTotal) {
      if (hasDateRangePause) {
        const { total: totalSched, active: activeSched } = countScheduledDays(
          year, month, effectiveDaysOfWeek, pauseStartDay!, pauseEndDay!
        )
        scheduledDays = totalSched
        activeDays = activeSched
        isProRated = activeSched < totalSched && totalSched > 0
        lineItemTotal = totalSched > 0
          ? roundCents((activeSched / totalSched) * effectiveRate)
          : 0
      } else {
        lineItemTotal = effectiveRate
      }
    }

    // --- Tax calculation ---
    const taxBehavior = fp.taxBehavior as string
    let lineItemTax = 0

    if (includedInTotal && !client.taxExempt) {
      if (taxBehavior === 'INHERIT_CLIENT' || taxBehavior === 'PRE_TAX') {
        lineItemTax = roundCents(lineItemTotal * clientTaxRate)
      }
      // TAX_INCLUDED means the rate already includes tax — no additional tax
    }

    // --- Build override description ---
    if (override) {
      const parts: string[] = []
      if (override.overrideRate != null) {
        parts.push(`rate → $${Number(override.overrideRate).toLocaleString()}`)
      }
      if (override.overrideStatus) {
        parts.push(`status → ${override.overrideStatus}`)
      }
      if (override.overrideFrequency != null) {
        parts.push(`frequency → ${override.overrideFrequency}x/week`)
      }
      if (hasDateRangePause) {
        parts.push(`paused ${month}/${pauseStartDay}–${month}/${pauseEndDay}`)
      }
      if (parts.length > 0) {
        explanation.overrides.push(
          `${locationName}: ${parts.join(', ')}${override.overrideNotes ? ` (${override.overrideNotes})` : ''}`
        )
      }
    }

    // --- Categorize for explanation ---
    switch (effectiveStatus) {
      case 'ACTIVE':
        explanation.activeFacilities.push(locationName)
        break
      case 'PAUSED':
        explanation.pausedFacilities.push(locationName)
        break
      case 'SEASONAL_PAUSED':
        explanation.seasonallyPaused.push(locationName)
        break
      case 'PENDING_APPROVAL':
        explanation.pendingApproval.push(locationName)
        break
      case 'CLOSED':
        explanation.closedFacilities.push(locationName)
        break
    }

    lineItems.push({
      facilityProfileId: fp.id,
      locationName,
      category: fp.category,
      effectiveStatus,
      effectiveRate,
      effectiveFrequency,
      effectiveDaysOfWeek,
      isOverridden,
      overrideNotes: override?.overrideNotes || null,
      isSeasonallyPaused,
      includedInTotal,
      taxBehavior,
      lineItemTax,
      lineItemTotal,
      isProRated,
      scheduledDays,
      activeDays,
      pauseStartDay,
      pauseEndDay,
    })
  }

  // --- Totals ---
  const subtotal = roundCents(lineItems.reduce((sum, li) => sum + li.lineItemTotal, 0))
  const taxAmount = roundCents(lineItems.reduce((sum, li) => sum + li.lineItemTax, 0))
  const total = roundCents(subtotal + taxAmount)

  // --- Previous month delta ---
  const { prevYear, prevMonth } = getPreviousMonth(year, month)
  let previousMonthTotal: number | null = null
  try {
    const prev = await generatePreviousMonthTotal(clientId, companyId, prevYear, prevMonth)
    previousMonthTotal = prev
    if (previousMonthTotal !== null) {
      explanation.deltaAmount = roundCents(total - previousMonthTotal)
      if (explanation.deltaAmount !== 0) {
        const dir = explanation.deltaAmount > 0 ? 'increase' : 'decrease'
        explanation.deltaReason = `$${Math.abs(explanation.deltaAmount).toLocaleString()} ${dir} from ${MONTH_LABELS[prevMonth]}`
      }
    }
  } catch {
    // If previous month calc fails, just skip delta
  }

  return {
    clientId: client.id,
    clientName: client.name,
    year,
    month,
    monthLabel: MONTH_LABELS[month],
    lineItems,
    subtotal,
    taxRate: clientTaxRate,
    taxAmount,
    total,
    displayMode: client.billingDisplayMode,
    explanation,
    previousMonthTotal,
    activeFacilityCount: lineItems.filter((li) => li.includedInTotal).length,
    totalFacilityCount: lineItems.length,
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function roundCents(n: number): number {
  return Math.round(n * 100) / 100
}

function getPreviousMonth(year: number, month: number) {
  if (month === 1) {
    return { prevYear: year - 1, prevMonth: 12 }
  }
  return { prevYear: year, prevMonth: month - 1 }
}

/**
 * Count total scheduled days in a month and active days after subtracting a pause range.
 *
 * @param year - Calendar year
 * @param month - 1-12
 * @param daysOfWeek - Array of scheduled day-of-week values (0=Sun..6=Sat)
 * @param pauseStart - First paused day of month (1-31)
 * @param pauseEnd - Last paused day of month (1-31)
 */
function countScheduledDays(
  year: number,
  month: number,
  daysOfWeek: number[],
  pauseStart: number,
  pauseEnd: number,
): { total: number; active: number } {
  const daysInMonth = new Date(year, month, 0).getDate()
  const dowSet = new Set(daysOfWeek)
  let total = 0
  let paused = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay()
    if (!dowSet.has(dow)) continue
    total++
    if (day >= pauseStart && day <= pauseEnd) {
      paused++
    }
  }

  return { total, active: total - paused }
}

/**
 * Check seasonal rules to determine if a facility is active in a given month.
 */
function isMonthActiveBySeasonalRules(
  rules: Array<{
    activeMonths: number[]
    pausedMonths: number[]
    effectiveYearStart: number | null
    effectiveYearEnd: number | null
  }>,
  year: number,
  month: number,
): boolean {
  if (rules.length === 0) return true

  for (const rule of rules) {
    if (rule.effectiveYearStart && year < rule.effectiveYearStart) continue
    if (rule.effectiveYearEnd && year > rule.effectiveYearEnd) continue

    if (rule.activeMonths.length > 0) {
      if (!rule.activeMonths.includes(month)) return false
    }

    if (rule.pausedMonths.length > 0) {
      if (rule.pausedMonths.includes(month)) return false
    }
  }

  return true
}

/**
 * Lightweight calculation of previous month total (avoids recursive full preview).
 */
async function generatePreviousMonthTotal(
  clientId: string,
  companyId: string,
  year: number,
  month: number,
): Promise<number | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    include: {
      facilityProfiles: {
        include: {
          seasonalRules: { where: { isActive: true } },
          monthlyOverrides: { where: { year, month } },
        },
      },
    },
  })

  if (!client) return null

  const clientTaxRate = client.taxRate ? Number(client.taxRate) : 0
  let total = 0

  for (const fp of client.facilityProfiles) {
    const override = fp.monthlyOverrides[0] || null
    const rate = override?.overrideRate != null
      ? Number(override.overrideRate)
      : Number(fp.defaultMonthlyRate)

    let status = fp.status as string
    if (override?.overrideStatus) {
      status = override.overrideStatus === 'PAUSED' ? 'PAUSED'
        : override.overrideStatus === 'CANCELLED' ? 'CLOSED'
        : 'ACTIVE'
    } else if (fp.seasonalRulesEnabled && status === 'ACTIVE') {
      if (!isMonthActiveBySeasonalRules(fp.seasonalRules, year, month)) {
        status = 'SEASONAL_PAUSED'
      }
    }

    if (status !== 'ACTIVE') continue

    // Pro-rate if date-range pause exists
    const daysOfWeek = override?.overrideDaysOfWeek?.length
      ? override.overrideDaysOfWeek
      : fp.normalDaysOfWeek
    const pauseStart = override?.pauseStartDay ?? null
    const pauseEnd = override?.pauseEndDay ?? null

    let lineTotal = rate
    if (pauseStart !== null && pauseEnd !== null) {
      const { total: totalSched, active } = countScheduledDays(year, month, daysOfWeek, pauseStart, pauseEnd)
      lineTotal = totalSched > 0 ? roundCents((active / totalSched) * rate) : 0
    }

    let lineTax = 0
    if (!client.taxExempt) {
      const tb = fp.taxBehavior as string
      if (tb === 'INHERIT_CLIENT' || tb === 'PRE_TAX') {
        lineTax = roundCents(lineTotal * clientTaxRate)
      }
    }
    total += lineTotal + lineTax
  }

  return roundCents(total)
}
