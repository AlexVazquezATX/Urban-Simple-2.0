import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/operations/service-reviews
 * Submit a service review for a location
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers can submit service reviews
    if (user.role !== 'MANAGER' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { reviewId, overallRating, checklistItems, painPoints, notes, photos } = body

    // Validate required fields
    if (!reviewId || !overallRating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Parse the reviewId to get location and shift info
    // Format expected: "shift-{shiftId}-location-{locationId}"
    const reviewIdParts = reviewId.split('-')
    const shiftId = reviewIdParts[1]
    const locationId = reviewIdParts[3]

    if (!shiftId || !locationId) {
      return NextResponse.json(
        { error: 'Invalid review ID format' },
        { status: 400 }
      )
    }

    // Verify the shift exists and belongs to this manager
    const shift = await prisma.shift.findFirst({
      where: {
        id: shiftId,
        managerId: user.id,
      },
      include: {
        shiftLocations: {
          where: { locationId },
        },
      },
    })

    if (!shift || shift.shiftLocations.length === 0) {
      return NextResponse.json(
        { error: 'Shift or location not found' },
        { status: 404 }
      )
    }

    const shiftLocation = shift.shiftLocations[0]

    // Create the service review
    const serviceReview = await prisma.serviceReview.create({
      data: {
        shiftLocationId: shiftLocation.id,
        reviewerId: user.id,
        overallRating,
        notes,
        photos: photos || [],
        status: 'COMPLETED',
      },
    })

    // Create checklist item verifications
    if (checklistItems && checklistItems.length > 0) {
      await prisma.checklistVerification.createMany({
        data: checklistItems.map((item: any) => ({
          serviceReviewId: serviceReview.id,
          checklistItemId: item.id,
          status: item.status.toUpperCase(),
          notes: item.notes || null,
          photos: item.photos || [],
        })),
      })
    }

    // Create pain points with auto-notification for critical issues
    if (painPoints && painPoints.length > 0) {
      const criticalPainPoints = painPoints.filter(
        (p: any) => p.severity === 'critical' || p.severity === 'high'
      )

      await prisma.painPoint.createMany({
        data: painPoints.map((point: any) => ({
          serviceReviewId: serviceReview.id,
          category: point.category.toUpperCase(),
          severity: point.severity.toUpperCase(),
          description: point.description,
          photos: point.photos || [],
          status: 'REPORTED',
        })),
      })

      // TODO: Send notification to client if there are critical pain points
      if (criticalPainPoints.length > 0) {
        // Get location and client info
        const location = await prisma.location.findUnique({
          where: { id: locationId },
          include: { client: true },
        })

        console.log(
          `[NOTIFICATION] Critical issues found at ${location?.name}:`,
          criticalPainPoints.map((p: any) => p.description)
        )

        // TODO: Implement actual notification system (email, SMS, in-app)
        // For now, we'll create a service log entry
        await prisma.serviceLog.create({
          data: {
            shiftLocationId: shiftLocation.id,
            type: 'ISSUE_REPORTED',
            description: `${criticalPainPoints.length} critical/high severity issue(s) reported`,
            severity: 'HIGH',
            status: 'PENDING',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      reviewId: serviceReview.id,
    })
  } catch (error: any) {
    console.error('Service review submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit review', details: error.message },
      { status: 500 }
    )
  }
}
