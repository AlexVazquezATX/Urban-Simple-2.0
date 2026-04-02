import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get tonight's shifts assigned to this associate
    const shifts = await prisma.shift.findMany({
      where: {
        associateId: user.id,
        date: { gte: today, lt: tomorrow },
        status: { not: 'cancelled' },
      },
      include: {
        shiftLocations: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                address: true,
                client: { select: { id: true, name: true } },
                checklistTemplate: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            client: { select: { id: true, name: true } },
            checklistTemplate: {
              select: { id: true, name: true },
            },
          },
        },
        serviceLogs: {
          select: {
            id: true,
            locationId: true,
            status: true,
            clockIn: true,
            clockOut: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    })

    // Build a flat list of locations with their status
    const locations = shifts.flatMap(shift => {
      const shiftLocs = shift.shiftLocations.length > 0
        ? shift.shiftLocations.map(sl => sl.location)
        : shift.location ? [shift.location] : []

      return shiftLocs.map(loc => {
        const log = shift.serviceLogs.find(l => l.locationId === loc.id)
        return {
          shiftId: shift.id,
          locationId: loc.id,
          locationName: loc.name,
          clientName: loc.client?.name || '',
          address: loc.address,
          checklistId: loc.checklistTemplate?.id || null,
          checklistName: loc.checklistTemplate?.name || null,
          shiftTime: `${shift.startTime} - ${shift.endTime}`,
          status: log?.status || 'pending',
          clockIn: log?.clockIn?.toISOString() || null,
          clockOut: log?.clockOut?.toISOString() || null,
          serviceLogId: log?.id || null,
        }
      })
    })

    return NextResponse.json({
      shifts: shifts.length,
      locations,
    })
  } catch (error) {
    console.error('Error fetching my night data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
