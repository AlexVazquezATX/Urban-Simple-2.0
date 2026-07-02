import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getStartOfLocalDay } from '@/lib/services/autopilot-schedule'

// Resolve the operational day as the current calendar day in the company's
// timezone. Shifts store `date` as a @db.Date at UTC midnight of the calendar
// day, so we express the company-local day the same way (mirrors the
// timezone-safe parsing in operations/dispatch/route). Using new Date() +
// setHours on Vercel (UTC) rolls "today" to tomorrow after ~7pm Austin (M8).
async function getOperationalToday(companyId: string, branchId?: string | null) {
  const branch = await prisma.branch.findFirst({
    where: { companyId, ...(branchId ? { id: branchId } : {}) },
    select: { timezone: true },
  })
  const timezone = branch?.timezone || 'America/Chicago'
  const localStart = getStartOfLocalDay(new Date(), timezone)
  return new Date(
    Date.UTC(
      localStart.getUTCFullYear(),
      localStart.getUTCMonth(),
      localStart.getUTCDate()
    )
  )
}

// Operations overview for the Manager dashboard. Deliberately money-free —
// managers see the floor, not the ledger. Returns: tonight's shift/crew
// summary, last night's review photos (proof of work), and an ops-only
// attention list (quality issues, open issues, unassigned shifts).
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const today = await getOperationalToday(user.companyId, user.branchId)
    const DAY_MS = 24 * 60 * 60 * 1000
    const tomorrow = new Date(today.getTime() + DAY_MS)
    const dayAfter = new Date(today.getTime() + 2 * DAY_MS)
    const twoDaysAgo = new Date(today.getTime() - 2 * DAY_MS)

    const branchScope = user.branchId ? { branchId: user.branchId } : {}

    const [tonightShifts, lastNightReviews, qualityReviews, openIssues, unassignedShifts] =
      await Promise.all([
        // Tonight's shifts (for the summary tiles)
        prisma.shift.findMany({
          where: {
            branch: { companyId: user.companyId, ...(user.branchId && { id: user.branchId }) },
            date: { gte: today, lt: tomorrow },
          },
          select: { id: true, associateId: true, status: true },
        }),

        // Last night's review photos — proof of work
        prisma.serviceReview.findMany({
          where: {
            location: { client: { companyId: user.companyId }, ...branchScope },
            reviewDate: { gte: twoDaysAgo },
            photos: { isEmpty: false },
          },
          include: {
            location: { select: { name: true, client: { select: { name: true } } } },
            associate: { select: { firstName: true, lastName: true, displayName: true } },
          },
          orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }],
          take: 6,
        }),

        // Quality issues flagged in recent reviews (last 7 days)
        prisma.serviceReview.findMany({
          where: {
            location: { client: { companyId: user.companyId }, ...branchScope },
            issuesFound: true,
            reviewDate: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
          include: {
            location: { select: { name: true } },
            associate: { select: { firstName: true, lastName: true } },
          },
          orderBy: { reviewDate: 'desc' },
          take: 8,
        }),

        // Open issues reported at locations (incl. client portal "Report something")
        prisma.issue.findMany({
          where: {
            location: { client: { companyId: user.companyId }, ...branchScope },
            status: { in: ['open', 'in_progress'] },
          },
          include: {
            location: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),

        // Unassigned shifts (today + tomorrow). A manager review route is
        // intentionally associateId=null (it carries a managerId instead), so
        // filtering on associateId=null alone flooded this rail with normal
        // manager routes (M9). A shift only needs coverage when it has neither
        // an associate nor a manager — mirroring the ShiftForm rule that every
        // shift must have one or the other.
        prisma.shift.findMany({
          where: {
            branch: { companyId: user.companyId, ...(user.branchId && { id: user.branchId }) },
            date: { gte: today, lt: dayAfter },
            associateId: null,
            managerId: null,
            status: { not: 'cancelled' },
          },
          include: {
            shiftLocations: { include: { location: { select: { name: true } } } },
          },
          take: 8,
        }),
      ])

    const crew = new Set(
      tonightShifts.filter((s) => s.associateId).map((s) => s.associateId as string)
    )

    const personName = (p: { firstName: string; lastName: string; displayName?: string | null }) =>
      p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Crew'

    const lastNightPhotos = lastNightReviews.flatMap((r) =>
      (r.photos || []).slice(0, 3).map((url, i) => ({
        id: `${r.id}-${i}`,
        url,
        locationName: r.location.name,
        clientName: r.location.client?.name ?? '',
        associateName: personName(r.associate),
        rating: Number(r.overallRating),
        reviewDate: r.reviewDate.toISOString(),
      }))
    ).slice(0, 9)

    type AttentionItem = {
      id: string
      type: 'quality_issue' | 'open_issue' | 'unassigned_shift'
      title: string
      subtitle: string
      urgency: 'high' | 'medium' | 'low'
      actionUrl: string
      createdAt: string
    }
    const attention: AttentionItem[] = []

    for (const r of qualityReviews) {
      attention.push({
        id: `review-${r.id}`,
        type: 'quality_issue',
        title: `Quality issue at ${r.location.name}`,
        subtitle: `${Number(r.overallRating).toFixed(1)}/5.0 · ${r.associate.firstName} ${r.associate.lastName}`,
        urgency: Number(r.overallRating) < 3 ? 'high' : 'medium',
        actionUrl: '/operations/nightly-reviews',
        createdAt: r.reviewDate.toISOString(),
      })
    }
    for (const issue of openIssues) {
      attention.push({
        id: `issue-${issue.id}`,
        type: 'open_issue',
        title: issue.title,
        subtitle: `${issue.location.name} · ${issue.category}`,
        urgency: issue.status === 'open' ? 'high' : 'medium',
        actionUrl: `/locations/${issue.location.id}`,
        createdAt: issue.createdAt.toISOString(),
      })
    }
    for (const shift of unassignedShifts) {
      const names = shift.shiftLocations.map((sl) => sl.location.name).join(', ')
      attention.push({
        id: `shift-${shift.id}`,
        type: 'unassigned_shift',
        title: `Unassigned shift: ${names || 'No locations'}`,
        subtitle: `${shift.startTime} – ${shift.endTime}`,
        urgency: 'high',
        actionUrl: '/operations/schedule',
        createdAt: shift.date.toISOString(),
      })
    }

    const urgencyOrder = { high: 0, medium: 1, low: 2 }
    attention.sort((a, b) => {
      const u = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      if (u !== 0) return u
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json({
      tonight: { shifts: tonightShifts.length, crew: crew.size },
      lastNightPhotos,
      attention,
      counts: {
        qualityIssues: qualityReviews.length,
        openIssues: openIssues.length,
        unassignedShifts: unassignedShifts.length,
      },
    })
  } catch (error) {
    console.error('Error fetching manager overview:', error)
    return NextResponse.json({ error: 'Failed to fetch manager overview' }, { status: 500 })
  }
}
