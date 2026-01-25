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
      shiftLocations: {
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
        },
        orderBy: {
          sortOrder: 'asc',
        },
      },
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
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">Schedule</h1>
          <p className="text-sm text-warm-500 mt-1">
            View manager schedules and associate assignments
          </p>
        </div>
        <ShiftForm defaultDate={today.toISOString().split('T')[0]}>
          <Button variant="lime" className="rounded-sm">
            <Plus className="mr-2 h-4 w-4" />
            Schedule Manager
          </Button>
        </ShiftForm>
      </div>

      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display font-medium text-warm-900">
                Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardTitle>
              <CardDescription className="text-xs text-warm-500 mt-1">
                {managerShifts.length} manager{' '}
                {managerShifts.length === 1 ? 'shift' : 'shifts'} scheduled
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/operations/schedule?week=${currentWeekOffset - 1}`}>
                <Button variant="outline" size="sm" className="rounded-sm">
                  <ChevronLeft className="h-4 w-4" />
                  Previous Week
                </Button>
              </Link>
              {currentWeekOffset !== 0 && (
                <Link href="/operations/schedule">
                  <Button variant="outline" size="sm" className="rounded-sm">This Week</Button>
                </Link>
              )}
              <Link href={`/operations/schedule?week=${currentWeekOffset + 1}`}>
                <Button variant="outline" size="sm" className="rounded-sm">
                  Next Week
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {/* Week Grid - 7 columns (Mon-Sun) */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dateKey = day.toISOString().split('T')[0]
              const dayShifts = shiftsByDate[dateKey] || []
              const isToday = isSameDay(day, today)
              const isPast = day < today && !isToday

              return (
                <div
                  key={dateKey}
                  className={`border rounded-sm flex flex-col min-h-100 ${
                    isToday
                      ? 'bg-warm-50 border-ocean-400'
                      : isPast
                        ? 'bg-warm-50/50 opacity-75'
                        : 'border-warm-200'
                  }`}
                >
                  {/* Day Header */}
                  <div className="p-3 border-b border-warm-200 bg-warm-50">
                    <div className="text-center">
                      <div className="text-xs font-medium text-warm-500 uppercase">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-2xl font-bold text-warm-900 mt-1">
                        {format(day, 'd')}
                      </div>
                      {isToday && (
                        <Badge className="mt-1 rounded-sm text-[10px] px-1.5 py-0 bg-ocean-100 text-ocean-700 border-ocean-200">
                          Today
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Day Content */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {/* Manager Shifts */}
                    {dayShifts.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-xs text-warm-500 italic">
                          No shifts
                        </p>
                        {!isPast && (
                          <ShiftForm defaultDate={dateKey}>
                            <Button variant="ghost" size="sm" className="mt-2 rounded-sm">
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </ShiftForm>
                        )}
                      </div>
                    ) : (
                      <>
                        {dayShifts.map((shift: any) => {
                          // Get locations from shiftLocations if available, otherwise fall back to single location
                          const locations =
                            shift.shiftLocations && shift.shiftLocations.length > 0
                              ? shift.shiftLocations.map((sl: any) => sl.location)
                              : shift.location
                                ? [shift.location]
                                : []

                          return (
                            <div
                              key={shift.id}
                              className="p-2 bg-white border border-warm-200 rounded-sm hover:border-ocean-400 transition-colors text-xs"
                            >
                              <div className="font-medium text-sm text-warm-900 mb-1">
                                {shift.manager.firstName} {shift.manager.lastName}
                              </div>
                              <div className="text-warm-500 mb-1">
                                {shift.startTime} - {shift.endTime}
                              </div>
                              {locations.length > 0 && (
                                <div className="text-warm-500 space-y-0.5">
                                  {locations.map((loc: any) => (
                                    <div key={loc.id} className="truncate" title={`${loc.client.name} - ${loc.name}`}>
                                      • {loc.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-1 mt-2">
                                <Badge
                                  className={`rounded-sm text-[10px] px-1.5 py-0 ${
                                    shift.status === 'completed'
                                      ? 'bg-lime-100 text-lime-700 border-lime-200'
                                      : shift.status === 'missed'
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : 'bg-warm-100 text-warm-600 border-warm-200'
                                  }`}
                                >
                                  {shift.status}
                                </Badge>
                                {locations.length > 1 && (
                                  <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">
                                    {locations.length} stops
                                  </Badge>
                                )}
                              </div>
                              {!isPast && (
                                <ShiftForm shift={shift}>
                                  <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs rounded-sm">
                                    Edit
                                  </Button>
                                </ShiftForm>
                              )}
                            </div>
                          )
                        })}
                        {!isPast && (
                          <ShiftForm defaultDate={dateKey}>
                            <Button variant="outline" size="sm" className="w-full text-xs rounded-sm">
                              <Plus className="h-3 w-3 mr-1" />
                              Add Shift
                            </Button>
                          </ShiftForm>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Associate Assignments - Show below the week grid */}
          {assignments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-warm-200">
              <h4 className="text-sm font-medium text-warm-700 mb-3">
                Associate Assignments (Recurring)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {assignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="text-sm p-2 bg-warm-50 rounded-sm border border-warm-200"
                  >
                    <span className="font-medium text-warm-900">
                      {assignment.user.firstName} {assignment.user.lastName}
                    </span>
                    <span className="text-warm-500">
                      {' '}
                      → {assignment.location.client.name} - {assignment.location.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          <Skeleton className="h-8 w-48 mb-2 rounded-sm" />
          <Skeleton className="h-4 w-64 rounded-sm" />
        </div>
        <Skeleton className="h-10 w-40 rounded-sm" />
      </div>
      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4">
          <Skeleton className="h-5 w-64 mb-2 rounded-sm" />
          <Skeleton className="h-3 w-48 rounded-sm" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-80 w-full rounded-sm" />
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
