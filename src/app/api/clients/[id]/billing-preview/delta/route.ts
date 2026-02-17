import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateBillingPreview } from '@/lib/billing/billing-engine'

// GET /api/clients/[id]/billing-preview/delta?year=2026&month=3
// Compares requested month with the previous month
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

    // Previous month
    const prevYear = month === 1 ? year - 1 : year
    const prevMonth = month === 1 ? 12 : month - 1

    // Generate both previews in parallel
    const [current, previous] = await Promise.all([
      generateBillingPreview(id, user.companyId, year, month),
      generateBillingPreview(id, user.companyId, prevYear, prevMonth),
    ])

    // Build per-facility comparison
    const facilityMap = new Map<string, {
      facilityProfileId: string
      locationName: string
      category: string | null
      currentStatus: string
      previousStatus: string
      currentRate: number
      previousRate: number
      currentTotal: number
      previousTotal: number
      currentFrequency: number
      previousFrequency: number
      currentIncluded: boolean
      previousIncluded: boolean
      totalDelta: number
      isNew: boolean
      isRemoved: boolean
      changeType: 'added' | 'removed' | 'changed' | 'unchanged'
    }>()

    // Process current month facilities
    for (const li of current.lineItems) {
      facilityMap.set(li.facilityProfileId, {
        facilityProfileId: li.facilityProfileId,
        locationName: li.locationName,
        category: li.category,
        currentStatus: li.effectiveStatus,
        previousStatus: '-',
        currentRate: li.effectiveRate,
        previousRate: 0,
        currentTotal: li.lineItemTotal,
        previousTotal: 0,
        currentFrequency: li.effectiveFrequency,
        previousFrequency: 0,
        currentIncluded: li.includedInTotal,
        previousIncluded: false,
        totalDelta: li.lineItemTotal,
        isNew: true,
        isRemoved: false,
        changeType: 'added',
      })
    }

    // Merge previous month facilities
    for (const li of previous.lineItems) {
      const existing = facilityMap.get(li.facilityProfileId)
      if (existing) {
        existing.previousStatus = li.effectiveStatus
        existing.previousRate = li.effectiveRate
        existing.previousTotal = li.lineItemTotal
        existing.previousFrequency = li.effectiveFrequency
        existing.previousIncluded = li.includedInTotal
        existing.totalDelta = existing.currentTotal - li.lineItemTotal
        existing.isNew = false

        // Determine change type
        if (existing.totalDelta === 0 && existing.currentStatus === li.effectiveStatus) {
          existing.changeType = 'unchanged'
        } else {
          existing.changeType = 'changed'
        }
      } else {
        // Facility existed last month but not this month
        facilityMap.set(li.facilityProfileId, {
          facilityProfileId: li.facilityProfileId,
          locationName: li.locationName,
          category: li.category,
          currentStatus: '-',
          previousStatus: li.effectiveStatus,
          currentRate: 0,
          previousRate: li.effectiveRate,
          currentTotal: 0,
          previousTotal: li.lineItemTotal,
          currentFrequency: 0,
          previousFrequency: li.effectiveFrequency,
          currentIncluded: false,
          previousIncluded: li.includedInTotal,
          totalDelta: -li.lineItemTotal,
          isNew: false,
          isRemoved: true,
          changeType: 'removed',
        })
      }
    }

    const facilities = Array.from(facilityMap.values())
    const changed = facilities.filter(f => f.changeType !== 'unchanged')
    const unchanged = facilities.filter(f => f.changeType === 'unchanged')

    return NextResponse.json({
      currentMonth: { year, month, monthLabel: current.monthLabel, total: current.total },
      previousMonth: { year: prevYear, month: prevMonth, monthLabel: previous.monthLabel, total: previous.total },
      totalDelta: current.total - previous.total,
      subtotalDelta: current.subtotal - previous.subtotal,
      taxDelta: current.taxAmount - previous.taxAmount,
      facilities,
      changedCount: changed.length,
      unchangedCount: unchanged.length,
    })
  } catch (error: any) {
    console.error('Delta report error:', error)
    if (error.message === 'Client not found') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to generate delta report' }, { status: 500 })
  }
}
