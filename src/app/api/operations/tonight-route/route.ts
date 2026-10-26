import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  associateLogsWhere,
  buildNightlyReviewId,
  checklistProgress,
  formatAddress,
  parseIncompleteItems,
  pickAssociateLog,
} from '@/lib/operations/nightly-reviews'
import { getStartOfLocalDay } from '@/lib/services/autopilot-schedule'

// Resolve the operational "tonight" as the current calendar day in the
// company's timezone. Shifts store `date` as a @db.Date at UTC midnight of the
// calendar day, so we express the company-local day the same way (mirrors the
// timezone-safe parsing in operations/dispatch/route). Using new Date() +
// setHours on Vercel (UTC) rolls "today" to tomorrow after ~7pm Austin (M8).
async function getOperationalDayRange(companyId: string, branchId?: string | null) {
  const branch = await prisma.branch.findFirst({
    where: { companyId, ...(branchId ? { id: branchId } : {}) },
    select: { timezone: true },
  })
  const timezone = branch?.timezone || 'America/Chicago'
  const localStart = getStartOfLocalDay(new Date(), timezone)
  const today = new Date(
    Date.UTC(
      localStart.getUTCFullYear(),
      localStart.getUTCMonth(),
      localStart.getUTCDate()
    )
  )
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  return { today, tomorrow }
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied. Manager privileges required.' },
        { status: 403 }
      )
    }

    const { today, tomorrow } = await getOperationalDayRange(
      user.companyId,
      user.branchId
    )

    // Admins see every manager's route for the night; managers see their own.
    const seeAll = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'

    const shifts = await prisma.shift.findMany({
      where: {
        managerId: seeAll ? { not: null } : user.id,
        branch: { companyId: user.companyId },
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            client: {
              select: {
                name: true,
              },
            },
            checklistTemplate: {
              select: {
                name: true,
              },
            },
          },
        },
        shiftLocations: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            location: {
              select: {
                id: true,
                name: true,
                address: true,
                client: {
                  select: {
                    name: true,
                  },
                },
                checklistTemplate: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        associate: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
        serviceLogs: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            locationId: true,
            status: true,
            reviews: {
              select: {
                id: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    const stopLocationIds = Array.from(
      new Set(
        shifts.flatMap((shift) =>
          shift.shiftLocations.length > 0
            ? shift.shiftLocations.map((stop) => stop.locationId)
            : shift.locationId
              ? [shift.locationId]
              : []
        )
      )
    )

    // The associate's work lives on their own shift; reviews may hang off
    // either that log or the route's own log, so match both by location + date.
    const [associateLogs, stopReviews] = stopLocationIds.length
      ? await Promise.all([
          prisma.serviceLog.findMany({
            where: associateLogsWhere(stopLocationIds, today),
            orderBy: [{ serviceDate: 'desc' }, { updatedAt: 'desc' }],
            select: {
              id: true,
              locationId: true,
              serviceDate: true,
              updatedAt: true,
              submittedAt: true,
              clockIn: true,
              clockOut: true,
              checklistData: true,
              incompleteItems: true,
              associate: {
                select: { firstName: true, lastName: true, displayName: true },
              },
              location: {
                select: { checklistTemplate: { select: { sections: true } } },
              },
              reviews: { select: { reviewDate: true } },
              issues: {
                where: { type: 'incomplete_work' },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { id: true },
              },
            },
          }),
          prisma.serviceReview.findMany({
            where: { reviewDate: today, locationId: { in: stopLocationIds } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, locationId: true },
          }),
        ])
      : [[], []]

    const reviewByLocation = new Map<string, string>()
    for (const review of stopReviews) {
      if (!reviewByLocation.has(review.locationId)) {
        reviewByLocation.set(review.locationId, review.id)
      }
    }

    const personName = (
      person: { firstName: string; lastName: string; displayName: string | null } | null
    ) =>
      person
        ? person.displayName || `${person.firstName || ''} ${person.lastName || ''}`.trim()
        : ''

    const locations = shifts.flatMap((shift) => {
      const routeStops =
        shift.shiftLocations.length > 0
          ? shift.shiftLocations.map((stop) => ({
              locationId: stop.locationId,
              location: stop.location,
            }))
          : shift.location
            ? [
                {
                  locationId: shift.location.id,
                  location: shift.location,
                },
              ]
            : []

      return routeStops.map((stop) => {
        const matchingServiceLog = shift.serviceLogs.find(
          (log) => log.locationId === stop.locationId
        )
        const matchingReviewId =
          matchingServiceLog?.reviews[0]?.id ?? reviewByLocation.get(stop.locationId)
        const status = matchingReviewId
          ? 'completed'
          : matchingServiceLog
            ? 'in_progress'
            : 'pending'

        const associateLog = pickAssociateLog(
          associateLogs.filter((log) => log.locationId === stop.locationId),
          shift.date
        )
        const progress = associateLog
          ? checklistProgress(
              associateLog.location.checklistTemplate?.sections ?? [],
              associateLog.checklistData
            )
          : null
        const associateStatus = !associateLog
          ? 'not_started'
          : associateLog.submittedAt
            ? 'submitted'
            : associateLog.clockIn && !associateLog.clockOut
              ? 'on_site'
              : associateLog.clockOut
                ? 'clocked_out'
                : 'not_started'

        return {
          id: buildNightlyReviewId(shift.id, stop.locationId),
          shiftId: shift.id,
          locationId: stop.locationId,
          locationName: stop.location.name,
          clientName: stop.location.client?.name || '',
          address: formatAddress(stop.location.address),
          scheduledTime: shift.startTime,
          checklistName:
            stop.location.checklistTemplate?.name || 'No checklist assigned',
          status,
          reviewId: matchingReviewId,
          serviceLogId: matchingServiceLog?.id ?? null,
          associateName:
            personName(associateLog?.associate ?? null) ||
            personName(shift.associate) ||
            'Unassigned',
          managerId: shift.managerId,
          managerName: personName(shift.manager) || 'Manager',
          associateStatus,
          clockIn: associateLog?.clockIn?.toISOString() ?? null,
          clockOut: associateLog?.clockOut?.toISOString() ?? null,
          checklistDone: progress?.done ?? null,
          checklistTotal: progress?.total ?? null,
          notDoneCount: associateLog ? parseIncompleteItems(associateLog.incompleteItems).length : 0,
          incompleteIssueId: associateLog?.issues[0]?.id ?? null,
        }
      })
    })

    return NextResponse.json({
      success: true,
      scope: seeAll ? 'all' : 'mine',
      date: today.toISOString(),
      locations,
      totalCount: locations.length,
      completedCount: locations.filter((location) => location.status === 'completed').length,
    })
  } catch (error) {
    console.error('Tonight route fetch error:', error)
    return NextResponse.json(
      { error: "Failed to fetch tonight's route" },
      { status: 500 }
    )
  }
}
