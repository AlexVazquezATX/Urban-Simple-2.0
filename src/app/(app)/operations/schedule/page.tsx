import { Suspense } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ShiftForm } from '@/components/operations/shift-form'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  subWeeks,
} from 'date-fns'
import Link from 'next/link'

interface SchedulePageProps {
  searchParams: Promise<{ week?: string }>
}

async function ScheduleView({ weekOffset = 0 }: { weekOffset: number }) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const today = new Date()
  const targetDate = weekOffset === 0 ? today : addWeeks(today, weekOffset)
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 })

  // Get manager shifts (for reviews/oversight)
  const managerShifts = await prisma.shift.findMany({
    where: {
      branch: {
        companyId: user.companyId,
        ...(user.branchId && { id: user.branchId }),
      },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      managerId: { not: null }, // Only manager shifts
    },
    include: {
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
        },
      },
      // shiftLocations will be available after Prisma client regeneration
      // shiftLocations: {
      //   include: {
      //     location: {
      //       select: {
      //         id: true,
      //         name: true,
      //         client: {
      //           select: {
      //             id: true,
      //             name: true,
      //           },
      //         },
      //       },
      //     },
      //   },
      //   orderBy: {
      //     sortOrder: 'asc',
      //   },
      // },
      associate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' },
    ],
  })

  // Get active location assignments to show who's working where
  const assignments = await prisma.locationAssignment.findMany({
    where: {
      location: {
        client: {
          branch: {
            companyId: user.companyId,
            ...(user.branchId && { id: user.branchId }),
          },
        },
      },
      isActive: true,
      startDate: { lte: weekEnd },
      OR: [{ endDate: null }, { endDate: { gte: weekStart } }],
    },
    include: {
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
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  })

  // Group manager shifts by date
  const shiftsByDate = managerShifts.reduce((acc: any, shift: any) => {
    const dateKey = new Date(shift.date).toISOString().split('T')[0]
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(shift)
    return acc
  }, {})

  // Group assignments by location for easy lookup
  const assignmentsByLocation = assignments.reduce((acc: any, assignment: any) => {
    if (!acc[assignment.locationId]) {
      acc[assignment.locationId] = []
    }
    acc[assignment.locationId].push(assignment)
    return acc
  }, {})

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const prevWeek = subWeeks(weekStart, 1)
  const nextWeek = addWeeks(weekStart, 1)
  const currentWeekOffset = weekOffset

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">
            View manager schedules and associate assignments
          </p>
        </div>
        <ShiftForm defaultDate={today.toISOString().split('T')[0]}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Manager
          </Button>
        </ShiftForm>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardTitle>
              <CardDescription className="mt-1">
                {managerShifts.length} manager{' '}
                {managerShifts.length === 1 ? 'shift' : 'shifts'} scheduled
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/operations/schedule?week=${currentWeekOffset - 1}`}>
                <Button variant="outline" size="sm">
                  <ChevronLeft className="h-4 w-4" />
                  Previous Week
                </Button>
              </Link>
              {currentWeekOffset !== 0 && (
                <Link href="/operations/schedule">
                  <Button variant="outline" size="sm">This Week</Button>
                </Link>
              )}
              <Link href={`/operations/schedule?week=${currentWeekOffset + 1}`}>
                <Button variant="outline" size="sm">
                  Next Week
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weekDays.map((day) => {
              const dateKey = day.toISOString().split('T')[0]
              const dayShifts = shiftsByDate[dateKey] || []
              const isToday = isSameDay(day, today)
              const isPast = day < today && !isToday

              return (
                <div
                  key={dateKey}
                  className={`border rounded-lg p-4 ${
                    isToday
                      ? 'bg-muted/50 border-primary'
                      : isPast
                        ? 'bg-muted/20 opacity-75'
                        : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">
                        {format(day, 'EEEE, MMMM d')}
                        {isToday && (
                          <Badge variant="default" className="ml-2">
                            Today
                          </Badge>
                        )}
                        {isPast && (
                          <Badge variant="secondary" className="ml-2">
                            Past
                          </Badge>
                        )}
                      </h3>
                    </div>
                    {!isPast && (
                      <ShiftForm defaultDate={dateKey}>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Schedule Manager
                        </Button>
                      </ShiftForm>
                    )}
                  </div>

                  {/* Manager Shifts */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Manager Reviews Scheduled
                    </h4>
                    {dayShifts.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No manager reviews scheduled
                      </p>
                    ) : (
                      <div className="space-y-2">
                      {dayShifts.map((shift: any) => {
                        // Get locations from shiftLocations if available, otherwise fall back to location
                        // TODO: After Prisma migration, uncomment shiftLocations include above
                        const locations = shift.location ? [shift.location] : []

                        return (
                          <div
                            key={shift.id}
                            className="flex items-start justify-between p-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">
                                  {shift.manager.firstName} {shift.manager.lastName}
                                </span>
                                <Badge
                                  variant={
                                    shift.status === 'completed'
                                      ? 'default'
                                      : shift.status === 'missed'
                                        ? 'destructive'
                                        : 'secondary'
                                  }
                                >
                                  {shift.status}
                                </Badge>
                                <Badge variant="outline">
                                  {locations.length} location{locations.length === 1 ? '' : 's'}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>
                                  <span className="font-medium">Locations:</span>
                                  <ul className="list-disc list-inside ml-2 mt-1">
                                    {locations.map((loc: any, idx: number) => (
                                      <li key={loc.id}>
                                        {loc.client.name} - {loc.name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <span>
                                    {shift.startTime} - {shift.endTime}
                                  </span>
                                  {shift.associate && (
                                    <>
                                      <span className="mx-2">•</span>
                                      <span>
                                        Reviewing: {shift.associate.firstName}{' '}
                                        {shift.associate.lastName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {!isPast && (
                              <ShiftForm shift={shift}>
                                <Button variant="ghost" size="sm">
                                  Edit
                                </Button>
                              </ShiftForm>
                            )}
                          </div>
                        )
                      })}
                      </div>
                    )}
                  </div>

                  {/* Associate Assignments - Show who's assigned to locations */}
                  <div className="pt-3 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Associate Assignments (Recurring)
                    </h4>
                    {assignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No active assignments
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {assignments.map((assignment: any) => (
                          <div
                            key={assignment.id}
                            className="text-sm p-2 bg-muted/30 rounded border"
                          >
                            <span className="font-medium">
                              {assignment.user.firstName} {assignment.user.lastName}
                            </span>
                            <span className="text-muted-foreground">
                              {' '}
                              → {assignment.location.client.name} - {assignment.location.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ScheduleViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function SchedulePage({
  searchParams,
}: SchedulePageProps) {
  const params = await searchParams
  const weekOffset = params.week ? parseInt(params.week, 10) : 0

  return (
    <Suspense fallback={<ScheduleViewSkeleton />}>
      <ScheduleView weekOffset={weekOffset} />
    </Suspense>
  )
}
