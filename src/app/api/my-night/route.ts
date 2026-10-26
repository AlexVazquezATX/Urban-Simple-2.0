import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOperationalWindow, overnightStillActive, parseIncompleteItems } from '@/lib/ops/field'

// GET /api/my-night — the signed-in associate's stops for tonight.
// "Tonight" = today's shifts, plus yesterday's overnight shifts that haven't
// ended (a 21:00-02:00 route must not vanish at midnight), plus any stop the
// associate is still clocked in on.
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { today, yesterday, tomorrow, nowMinutes } = await getOperationalWindow(
      user.companyId,
      user.branchId
    )

    const locationSelect = {
      id: true,
      name: true,
      address: true,
      client: { select: { id: true, name: true } },
      checklistTemplate: { select: { id: true, name: true } },
    } as const

    const [shifts, me] = await Promise.all([
      prisma.shift.findMany({
        where: {
          associateId: user.id,
          date: { gte: yesterday, lt: tomorrow },
          status: { not: 'cancelled' },
        },
        include: {
          shiftLocations: {
            include: { location: { select: locationSelect } },
            orderBy: { sortOrder: 'asc' },
          },
          location: { select: locationSelect },
          serviceLogs: {
            where: { associateId: user.id },
            select: {
              id: true,
              locationId: true,
              status: true,
              clockIn: true,
              clockOut: true,
              submittedAt: true,
              checklistData: true,
              incompleteItems: true,
              overallNotes: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
      prisma.user.findUnique({ where: { id: user.id }, select: { preferredLanguage: true } }),
    ])

    const tonight = shifts.filter(shift => {
      const onTheClock = shift.serviceLogs.some(l => l.clockIn && !l.clockOut)
      if (shift.date.getTime() >= today.getTime()) {
        // Before noon, tonight's evening shift isn't "tonight" yet: at 1:30am
        // the associate is still on last night's route and must not clock into
        // the coming night's shift by mistake.
        const start = parseInt(shift.startTime.slice(0, 2), 10)
        const startsInEvening = Number.isFinite(start) && start >= 12
        if (nowMinutes < 12 * 60 && startsInEvening && !shift.serviceLogs.length) return false
        return true
      }
      return onTheClock || overnightStillActive(shift.startTime, shift.endTime, nowMinutes)
    })

    const locations = tonight.flatMap(shift => {
      const shiftLocs = shift.shiftLocations.length > 0
        ? shift.shiftLocations.map(sl => sl.location)
        : shift.location ? [shift.location] : []

      return shiftLocs.map(loc => {
        const log = shift.serviceLogs.find(l => l.locationId === loc.id)
        const notDone = parseIncompleteItems(log?.incompleteItems)
        // A visit is only "done" once the associate finishes it; saving
        // progress keeps it in progress (and on the clock).
        const status = log?.submittedAt
          ? (notDone.length > 0 ? 'partial' : 'completed')
          : log?.clockIn
            ? 'in_progress'
            : 'pending'
        return {
          shiftId: shift.id,
          locationId: loc.id,
          locationName: loc.name,
          clientName: loc.client?.name || '',
          address: loc.address,
          checklistId: loc.checklistTemplate?.id || null,
          checklistName: loc.checklistTemplate?.name || null,
          shiftTime: `${shift.startTime} - ${shift.endTime}`,
          status,
          clockIn: log?.clockIn?.toISOString() || null,
          clockOut: log?.clockOut?.toISOString() || null,
          submittedAt: log?.submittedAt?.toISOString() || null,
          notDoneCount: notDone.length,
          checklistData: (log?.checklistData as Record<string, boolean> | null) || null,
          overallNotes: log?.overallNotes || null,
          serviceLogId: log?.id || null,
        }
      })
    })

    return NextResponse.json({
      shifts: tonight.length,
      language: me?.preferredLanguage === 'es' ? 'es' : 'en',
      locations,
    })
  } catch (error) {
    console.error('Error fetching my night data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
