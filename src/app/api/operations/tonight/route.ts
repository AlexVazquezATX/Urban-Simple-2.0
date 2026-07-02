import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
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
          select: { id: true, status: true, clockIn: true, clockOut: true },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    })

    // Serialize dates
    const serialized = shifts.map(shift => ({
      ...shift,
      date: shift.date.toISOString(),
      createdAt: shift.createdAt.toISOString(),
      updatedAt: shift.updatedAt.toISOString(),
      serviceLogs: shift.serviceLogs.map(log => ({
        ...log,
        clockIn: log.clockIn?.toISOString() || null,
        clockOut: log.clockOut?.toISOString() || null,
      })),
    }))

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error fetching tonight shifts:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}
