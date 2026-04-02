import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Tonight = today's date (shifts are overnight, so "tonight" means today's date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

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
