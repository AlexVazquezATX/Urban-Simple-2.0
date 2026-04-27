import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  buildNightlyReviewId,
  formatAddress,
} from '@/lib/operations/nightly-reviews'

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

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const shifts = await prisma.shift.findMany({
      where: {
        managerId: user.id,
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
        serviceLogs: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            locationId: true,
            status: true,
            reviews: {
              where: {
                reviewerId: user.id,
              },
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
        const matchingReview = matchingServiceLog?.reviews[0]
        const status = matchingReview
          ? 'completed'
          : matchingServiceLog
            ? 'in_progress'
            : 'pending'

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
          reviewId: matchingReview?.id,
          serviceLogId: matchingServiceLog?.id ?? null,
          associateName:
            shift.associate?.displayName ||
            `${shift.associate?.firstName || ''} ${shift.associate?.lastName || ''}`.trim() ||
            'Unassigned',
        }
      })
    })

    return NextResponse.json({
      success: true,
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
