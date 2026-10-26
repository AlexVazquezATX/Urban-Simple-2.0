import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getStartOfLocalDay } from '@/lib/services/autopilot-schedule'
import { checklistProgress, parseIncompleteItems } from '@/lib/operations/nightly-reviews'

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

    // Tonight = today's date (shifts are overnight, so "tonight" means today's date)
    const { today, tomorrow } = await getOperationalDayRange(
      user.companyId,
      user.branchId
    )

    const shifts = await prisma.shift.findMany({
      where: {
        branch: {
          companyId: user.companyId,
          ...(user.branchId && { id: user.branchId }),
        },
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
            client: {
              select: { id: true, name: true },
            },
            checklistTemplate: {
              select: { sections: true },
            },
          },
        },
        shiftLocations: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                client: {
                  select: { id: true, name: true },
                },
                checklistTemplate: {
                  select: { sections: true },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        associate: {
          select: { id: true, firstName: true, lastName: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
        serviceLogs: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            locationId: true,
            status: true,
            clockIn: true,
            clockOut: true,
            submittedAt: true,
            checklistData: true,
            incompleteItems: true,
            issues: {
              where: { type: 'incomplete_work' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true },
            },
          },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    })

    type StopLocation = {
      id: string
      name: string
      client: { id: string; name: string } | null
      checklistTemplate: { sections: unknown } | null
    }
    const publicLocation = (location: StopLocation) => ({
      id: location.id,
      name: location.name,
      client: location.client,
    })

    // Serialize dates. Associate shifts also get a per-stop summary of the
    // work logged so far; manager review routes have no associate work.
    const serialized = shifts.map(shift => {
      const stopLocations: StopLocation[] =
        shift.shiftLocations.length > 0
          ? shift.shiftLocations.map(sl => sl.location)
          : shift.location
            ? [shift.location]
            : []

      const stops = shift.associateId
        ? stopLocations.map(location => {
            const log = shift.serviceLogs.find(l => l.locationId === location.id)
            const progress = log
              ? checklistProgress(location.checklistTemplate?.sections ?? [], log.checklistData)
              : null
            return {
              locationId: location.id,
              locationName: location.name,
              status: !log
                ? 'not_started'
                : log.submittedAt
                  ? 'submitted'
                  : log.clockIn && !log.clockOut
                    ? 'on_site'
                    : log.clockOut
                      ? 'clocked_out'
                      : 'not_started',
              clockIn: log?.clockIn?.toISOString() ?? null,
              clockOut: log?.clockOut?.toISOString() ?? null,
              done: progress?.done ?? 0,
              total: progress?.total ?? 0,
              notDoneCount: log ? parseIncompleteItems(log.incompleteItems).length : 0,
              issueId: log?.issues[0]?.id ?? null,
            }
          })
        : []

      return {
        ...shift,
        location: shift.location ? publicLocation(shift.location) : null,
        shiftLocations: shift.shiftLocations.map(sl => ({
          ...sl,
          location: publicLocation(sl.location),
        })),
        date: shift.date.toISOString(),
        createdAt: shift.createdAt.toISOString(),
        updatedAt: shift.updatedAt.toISOString(),
        serviceLogs: shift.serviceLogs.map(log => ({
          id: log.id,
          locationId: log.locationId,
          status: log.status,
          clockIn: log.clockIn?.toISOString() || null,
          clockOut: log.clockOut?.toISOString() || null,
          submittedAt: log.submittedAt?.toISOString() || null,
        })),
        stops,
      }
    })

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error fetching tonight shifts:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}
