import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/operations/tonight-route
 * Get locations scheduled for tonight's service (for manager reviews)
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only MANAGER and above can access
    if (!['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied. Manager privileges required.' },
        { status: 403 }
      )
    }

    // Get today's date (start and end of day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get tonight's shifts for this manager
    const shifts = await prisma.shift.findMany({
      where: {
        managerId: user.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        shiftLocations: {
          include: {
            location: {
              include: {
                client: true,
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
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // Get existing reviews for these shifts
    const shiftIds = shifts.map((s) => s.id)
    const existingReviews = await prisma.serviceReview.findMany({
      where: {
        serviceLog: {
          shiftId: {
            in: shiftIds,
          },
        },
        reviewerId: user.id,
      },
      include: {
        serviceLog: true,
      },
    })

    // Build location list with review status
    const locations = shifts.flatMap((shift) =>
      shift.shiftLocations.map((sl) => {
        const review = existingReviews.find(
          (r) => r.serviceLog && r.serviceLog.locationId === sl.locationId
        )

        return {
          id: `${shift.id}-${sl.locationId}`,
          shiftId: shift.id,
          locationId: sl.locationId,
          locationName: sl.location.name,
          clientName: sl.location.client.name,
          address: formatAddress(sl.location.address),
          scheduledTime: shift.startTime, // Already formatted as "21:00"
          checklistName: sl.location.checklistTemplate?.name || 'Standard Checklist',
          status: review ? 'completed' : 'pending',
          reviewId: review?.id,
          associateName: `${shift.associate.firstName} ${shift.associate.lastName}`,
        }
      })
    )

    return NextResponse.json({
      success: true,
      date: today.toISOString(),
      locations,
      totalCount: locations.length,
      completedCount: locations.filter((l) => l.status === 'completed').length,
    })
  } catch (error: any) {
    console.error('Tonight route fetch error:', error)
    return NextResponse.json(
      { error: "Failed to fetch tonight's route", details: error.message },
      { status: 500 }
    )
  }
}

// Helper function to format address from JSON
function formatAddress(addressJson: any): string {
  if (!addressJson) return 'Address not available'

  const addr = typeof addressJson === 'string' ? JSON.parse(addressJson) : addressJson

  const parts = [
    addr.street || addr.address1,
    addr.city,
    addr.state,
    addr.zip || addr.postalCode,
  ].filter(Boolean)

  return parts.join(', ')
}
