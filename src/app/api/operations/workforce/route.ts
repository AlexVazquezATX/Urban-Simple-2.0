import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Compute derived data for each associate
    const result = associates.map((assoc) => {
      let totalEstWeeklyHours = 0
      let totalMonthlyPay = 0
      let totalAccountRevenue = 0

      const accounts = assoc.assignedLocations.map((assignment) => {
        const nights = assignment.nightsPerWeek
          ?? assignment.daysOfWeek.length
          ?? assignment.location.facilityProfile?.normalFrequencyPerWeek
          ?? 0
        const hoursPerVisit = assignment.estimatedHoursPerVisit
          ? parseFloat(assignment.estimatedHoursPerVisit.toString())
          : 0
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

      // Hours status thresholds
      let hoursStatus: 'safe' | 'watch' | 'warning' | 'danger' = 'safe'
      if (totalEstWeeklyHours >= 40) hoursStatus = 'danger'
      else if (totalEstWeeklyHours >= 38) hoursStatus = 'warning'
      else if (totalEstWeeklyHours >= 32) hoursStatus = 'watch'

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
        totalEstWeeklyHours: Math.round(totalEstWeeklyHours * 100) / 100,
        totalMonthlyPay: Math.round(totalMonthlyPay * 100) / 100,
        totalAccountRevenue: Math.round(totalAccountRevenue * 100) / 100,
        hoursStatus,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Workforce API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
