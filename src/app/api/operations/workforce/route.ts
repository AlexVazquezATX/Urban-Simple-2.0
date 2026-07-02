import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalDayOfWeek, getStartOfLocalDay } from '@/lib/services/autopilot-schedule'

// Sane default when a crew has no explicit nights/estimate and no facility
// frequency to fall back on — most accounts are serviced ~5 nights/week.
const DEFAULT_NIGHTS_PER_WEEK = 5

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Pay + account revenue are sensitive. Mirror manager-overview: only floor
    // leadership (managers) and admins may see this dashboard. Everyone else 403s.
    if (!['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Resolve the company timezone for the weekly (overtime) boundary.
    const primaryBranch = await prisma.branch.findFirst({
      where: { companyId: user.companyId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { timezone: true },
    })
    const timezone = primaryBranch?.timezone || 'America/Chicago'

    // Start of the current local week (Sunday 00:00) as a UTC instant. Overtime
    // is a weekly measure, so actual worked hours are summed across this window.
    const now = new Date()
    const startOfToday = getStartOfLocalDay(now, timezone)
    const localDow = getLocalDayOfWeek(now, timezone) // 0=Sun..6=Sat
    // Build DATE-ONLY UTC boundaries aligned to the local week's calendar dates.
    // ServiceLog.serviceDate is a @db.Date column stored at midnight UTC, so the
    // window must be midnight-UTC of the week's Sunday — not a local-midnight
    // instant (05:00Z for CT), which would shift the window a day and undercount
    // hours (dangerous for an overtime tool). startOfToday's UTC Y/M/D equals the
    // local calendar date for western-hemisphere zones, which this business uses.
    const weekStart = new Date(Date.UTC(
      startOfToday.getUTCFullYear(),
      startOfToday.getUTCMonth(),
      startOfToday.getUTCDate() - localDow
    ))
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Get all associates with their assignments, locations, clients, agreements, and facility profiles
    const associates = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        role: 'ASSOCIATE',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        assignedLocations: {
          where: { isActive: true },
          select: {
            id: true,
            locationId: true,
            monthlyPay: true,
            startDate: true,
            estimatedHoursPerVisit: true,
            cleaningWindowStart: true,
            cleaningWindowEnd: true,
            daysOfWeek: true,
            nightsPerWeek: true,
            location: {
              select: {
                id: true,
                name: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                facilityProfile: {
                  select: {
                    normalDaysOfWeek: true,
                    normalFrequencyPerWeek: true,
                    defaultMonthlyRate: true,
                    category: true,
                  },
                },
                serviceAgreements: {
                  where: { isActive: true },
                  select: {
                    monthlyAmount: true,
                  },
                },
              },
            },
          },
        },
        associate: {
          select: {
            startDate: true,
            onboardingStatus: true,
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    })

    // Actual worked hours this week from clock-in/out capture (ServiceLog).
    // When present, these are preferred over the schedule estimate. The clock
    // endpoints are owned by another bundle — here we only consume what's logged.
    const associateIds = associates.map((a) => a.id)
    const serviceLogs = associateIds.length
      ? await prisma.serviceLog.findMany({
          where: {
            associateId: { in: associateIds },
            serviceDate: { gte: weekStart, lt: weekEnd },
            clockIn: { not: null },
            clockOut: { not: null },
          },
          select: { associateId: true, clockIn: true, clockOut: true },
        })
      : []

    const actualHoursByAssociate = new Map<string, number>()
    for (const log of serviceLogs) {
      if (!log.clockIn || !log.clockOut) continue
      const ms = log.clockOut.getTime() - log.clockIn.getTime()
      if (ms <= 0) continue
      const hours = ms / (1000 * 60 * 60)
      actualHoursByAssociate.set(
        log.associateId,
        (actualHoursByAssociate.get(log.associateId) || 0) + hours
      )
    }

    // Compute derived data for each associate
    const result = associates.map((assoc) => {
      let totalEstWeeklyHours = 0
      let totalMonthlyPay = 0
      let totalAccountRevenue = 0
      // True when at least one active assignment lacks the inputs needed to
      // estimate hours. Such crews must not silently read as "safe".
      let hasEstimateGap = false

      const accounts = assoc.assignedLocations.map((assignment) => {
        // Fallback chain for nights/week. daysOfWeek is Int[] default [] (never
        // null), and facilityProfile.normalFrequencyPerWeek defaults to 0, so a
        // naive ?? chain short-circuits on those falsy-but-present values and the
        // real fallbacks go dead. Treat empty / zero as "unknown" and fall through.
        const facilityFreq = assignment.location.facilityProfile?.normalFrequencyPerWeek
        const nights =
          assignment.nightsPerWeek ??
          (assignment.daysOfWeek.length > 0
            ? assignment.daysOfWeek.length
            : facilityFreq && facilityFreq > 0
              ? facilityFreq
              : DEFAULT_NIGHTS_PER_WEEK)
        const hoursPerVisit = assignment.estimatedHoursPerVisit
          ? parseFloat(assignment.estimatedHoursPerVisit.toString())
          : 0
        // No per-visit estimate means we cannot trust this assignment's hours.
        if (hoursPerVisit <= 0) hasEstimateGap = true
        const estWeeklyHours = hoursPerVisit * nights
        totalEstWeeklyHours += estWeeklyHours
        totalMonthlyPay += parseFloat(assignment.monthlyPay.toString())

        const accountRevenue = assignment.location.serviceAgreements.reduce(
          (sum, sa) => sum + parseFloat(sa.monthlyAmount.toString()),
          0
        )
        totalAccountRevenue += accountRevenue

        return {
          assignmentId: assignment.id,
          locationId: assignment.locationId,
          locationName: assignment.location.name,
          clientName: assignment.location.client.name,
          clientId: assignment.location.client.id,
          category: assignment.location.facilityProfile?.category || null,
          monthlyPay: parseFloat(assignment.monthlyPay.toString()),
          accountRevenue,
          estimatedHoursPerVisit: hoursPerVisit,
          nightsPerWeek: nights,
          estWeeklyHours,
          cleaningWindowStart: assignment.cleaningWindowStart,
          cleaningWindowEnd: assignment.cleaningWindowEnd,
          daysOfWeek: assignment.daysOfWeek,
          startDate: assignment.startDate,
        }
      })

      // Drive risk off the WORST case of scheduled vs actually-clocked hours.
      // Preferring actuals alone would mask projected overtime mid-week: someone
      // scheduled for 45h who has clocked only 8h so far must still read
      // "danger", not "safe". Once real hours exceed the estimate (overtime
      // beyond the schedule), actuals dominate.
      const actualWeeklyHours = actualHoursByAssociate.get(assoc.id) || 0
      const hasActuals = actualWeeklyHours > 0
      const weeklyHours = Math.max(actualWeeklyHours, totalEstWeeklyHours)
      const actualsDominate = hasActuals && actualWeeklyHours >= totalEstWeeklyHours

      // Hours status thresholds. Danger is >= 40h: at exactly 40 an associate is
      // at the legal cap, which is the safer direction to flag for overtime.
      // (The "40h+" tile label matches this inclusive math.)
      let hoursStatus: 'safe' | 'watch' | 'warning' | 'danger' = 'safe'
      if (weeklyHours >= 40) hoursStatus = 'danger'
      else if (weeklyHours >= 38) hoursStatus = 'warning'
      else if (weeklyHours >= 32) hoursStatus = 'watch'

      return {
        id: assoc.id,
        firstName: assoc.firstName,
        lastName: assoc.lastName,
        email: assoc.email,
        phone: assoc.phone,
        avatarUrl: assoc.avatarUrl,
        startDate: assoc.associate?.startDate || null,
        onboardingStatus: assoc.associate?.onboardingStatus || null,
        accounts,
        totalAccounts: accounts.length,
        totalEstWeeklyHours: Math.round(weeklyHours * 100) / 100,
        totalMonthlyPay: Math.round(totalMonthlyPay * 100) / 100,
        totalAccountRevenue: Math.round(totalAccountRevenue * 100) / 100,
        hoursStatus,
        hoursSource: actualsDominate ? ('actual' as const) : ('estimate' as const),
        hasEstimateGap: !actualsDominate && hasEstimateGap,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Workforce API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
