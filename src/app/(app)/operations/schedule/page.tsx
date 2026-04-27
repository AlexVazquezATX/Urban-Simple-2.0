import { Suspense } from 'react'
import { Plus, ChevronLeft, ChevronRight, AlertTriangle, CalendarX, UserX } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ShiftForm } from '@/components/operations/shift-form'
import { DispatchGenerateButton } from '@/components/operations/dispatch-generate-button'
import { DispatchCreateRouteButton } from '@/components/operations/dispatch-create-route-button'
import { ManagerAssignmentDialog } from '@/components/operations/manager-assignment-dialog'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
} from 'date-fns'
import Link from 'next/link'
import { isServiceDay, normalizeServiceProfile } from '@/lib/operations/dispatch'
import {
  findCoverageGaps,
  findCapacityWarnings,
  findRouteConflicts,
  findUnassignedRoutes,
} from '@/lib/operations/dispatch-exceptions'

type ScheduleShift = Prisma.ShiftGetPayload<{
  include: {
    location: {
      select: {
        id: true
        name: true
        client: {
          select: {
            id: true
            name: true
          }
        }
      }
    }
    shiftLocations: {
      include: {
        location: {
          select: {
            id: true
            name: true
            client: {
              select: {
                id: true
                name: true
              }
            }
          }
        }
      }
    }
    associate: {
      select: {
        id: true
        firstName: true
        lastName: true
      }
    }
    manager: {
      select: {
        id: true
        firstName: true
        lastName: true
      }
    }
  }
}>

type ScheduleAssignment = Prisma.LocationAssignmentGetPayload<{
  include: {
    location: {
      select: {
        id: true
        name: true
        client: {
          select: {
            id: true
            name: true
          }
        }
      }
    }
    user: {
      select: {
        id: true
        firstName: true
        lastName: true
        role: true
      }
    }
  }
}>

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

  const shifts = await prisma.shift.findMany({
    where: {
      branch: {
        companyId: user.companyId,
        ...(user.branchId && { id: user.branchId }),
      },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
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

  const managerShifts = shifts.filter((shift) => shift.managerId)

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

  const dispatchLocations = await prisma.location.findMany({
    where: {
      isActive: true,
      client: {
        companyId: user.companyId,
        ...(user.branchId && { branchId: user.branchId }),
      },
    },
    include: {
      serviceProfile: {
        include: {
          defaultManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      },
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
  })

  // Group manager shifts by date
  const shiftsByDate = managerShifts.reduce<Record<string, ScheduleShift[]>>((acc, shift) => {
    const dateKey = new Date(shift.date).toISOString().split('T')[0]
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(shift)
    return acc
  }, {})

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const currentWeekOffset = weekOffset
  const autoRouteLocations = dispatchLocations.filter(
    (location) => location.serviceProfile?.autoSchedule
  )
  const dispatchReadyLocations = autoRouteLocations.filter(
    (location) =>
      location.serviceProfile?.defaultManagerId &&
      normalizeServiceProfile(location.serviceProfile).serviceDays.length > 0
  )
  const dispatchNeedsSetup = autoRouteLocations.filter(
    (location) =>
      !location.serviceProfile?.defaultManagerId ||
      normalizeServiceProfile(location.serviceProfile).serviceDays.length === 0
  )
  const dueThisWeekCount = autoRouteLocations.filter((location) =>
    weekDays.some((day) =>
      isServiceDay(normalizeServiceProfile(location.serviceProfile).serviceDays, day)
    )
  ).length
  const coverageGaps = findCoverageGaps(dispatchLocations, shifts, weekDays)
  const unassignedRoutes = findUnassignedRoutes(shifts)
  const routeConflicts = findRouteConflicts(managerShifts)
  const capacityWarnings = findCapacityWarnings(dispatchLocations, managerShifts)
  const exceptionCount =
    coverageGaps.length + unassignedRoutes.length + routeConflicts.length + capacityWarnings.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">Schedule</h1>
          <p className="text-sm text-warm-500 dark:text-cream-400 mt-1">
            View manager schedules and associate assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DispatchGenerateButton rangeStart={weekStart.toISOString().split('T')[0]} />
          <ShiftForm defaultDate={today.toISOString().split('T')[0]}>
            <Button variant="lime" className="rounded-sm">
              <Plus className="mr-2 h-4 w-4" />
              Schedule Manager
            </Button>
          </ShiftForm>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400">Dispatch Ready</p>
            <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
              {dispatchReadyLocations.length}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              {dueThisWeekCount} auto-route location{dueThisWeekCount === 1 ? '' : 's'} due this week
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400">Needs Dispatch Setup</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">
              {dispatchNeedsSetup.length}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              Missing default manager or service days
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400">Manager Routes</p>
            <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
              {managerShifts.length}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              Generated and manual manager review shifts this week
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400">Dispatch Exceptions</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {exceptionCount}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              {coverageGaps.length} uncovered, {unassignedRoutes.length} unassigned, {routeConflicts.length} conflicting, {capacityWarnings.length} capacity
            </p>
          </CardContent>
        </Card>
      </div>

      {dispatchNeedsSetup.length > 0 && (
        <Card className="rounded-sm border-orange-200 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100">
              Dispatch Setup Needed
            </CardTitle>
            <CardDescription className="text-xs text-warm-500 dark:text-cream-400">
              These locations are marked for auto-routing but still need dispatch inputs.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {dispatchNeedsSetup.slice(0, 8).map((location) => (
                <Link key={location.id} href={`/locations/${location.id}`}>
                  <Badge variant="outline" className="rounded-sm border-orange-200 text-orange-700">
                    {location.client.name} - {location.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {exceptionCount > 0 && (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-sm border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-warm-900 dark:text-cream-100">
                <CalendarX className="h-4 w-4 text-red-600" />
                Uncovered Stops
              </CardTitle>
              <CardDescription className="text-xs text-warm-500 dark:text-cream-400">
                Auto-route locations due this week with no manager route scheduled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {coverageGaps.length === 0 ? (
                <p className="text-xs text-warm-500 dark:text-cream-400">No uncovered stops this week.</p>
              ) : (
                coverageGaps.slice(0, 6).map((gap) => (
                  <div
                    key={`${gap.dateKey}-${gap.locationId}`}
                    className="rounded-sm border border-red-200 bg-white/80 p-2 text-xs text-warm-700 dark:border-red-950 dark:bg-charcoal-900"
                  >
                    <Link
                      href={`/locations/${gap.locationId}`}
                      className="block transition-colors hover:text-warm-900 dark:hover:text-cream-100"
                    >
                      <div className="font-medium text-warm-900 dark:text-cream-100">
                        {gap.clientName} - {gap.locationName}
                      </div>
                      <div className="mt-1 text-warm-500 dark:text-cream-400">
                        {format(new Date(`${gap.dateKey}T12:00:00`), 'EEE, MMM d')} - {gap.managerName}
                      </div>
                    </Link>
                    <DispatchCreateRouteButton
                      locationId={gap.locationId}
                      date={gap.dateKey}
                      locationLabel={`${gap.clientName} - ${gap.locationName}`}
                    />
                    <ManagerAssignmentDialog
                      mode="route"
                      locationId={gap.locationId}
                      date={gap.dateKey}
                      locationLabel={`${gap.clientName} - ${gap.locationName}`}
                      currentManagerId={gap.defaultManagerId}
                      buttonLabel="Assign Alt Manager"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-sm border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-warm-900 dark:text-cream-100">
                <UserX className="h-4 w-4 text-amber-600" />
                Unassigned Routes
              </CardTitle>
              <CardDescription className="text-xs text-warm-500 dark:text-cream-400">
                Shift records without a manager assignment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {unassignedRoutes.length === 0 ? (
                <p className="text-xs text-warm-500 dark:text-cream-400">No unassigned routes this week.</p>
              ) : (
                unassignedRoutes.slice(0, 6).map((route) => {
                  const shift = shifts.find((entry) => entry.id === route.shiftId)
                  if (!shift) {
                    return null
                  }

                  return (
                    <div
                      key={route.shiftId}
                      className="rounded-sm border border-amber-200 bg-white/80 p-2 text-xs dark:border-amber-950 dark:bg-charcoal-900"
                    >
                      <div className="font-medium text-warm-900 dark:text-cream-100">
                        {format(new Date(`${route.dateKey}T12:00:00`), 'EEE, MMM d')} - {route.timeRange}
                      </div>
                      <div className="mt-1 text-warm-500 dark:text-cream-400">{route.locationSummary}</div>
                      <ShiftForm shift={shift}>
                        <Button variant="ghost" size="sm" className="mt-2 h-7 rounded-sm px-2 text-xs">
                          Assign Manager
                        </Button>
                      </ShiftForm>
                      <ManagerAssignmentDialog
                        mode="shift"
                        shiftId={route.shiftId}
                        locationLabel={route.locationSummary}
                        buttonLabel="Quick Assign"
                      />
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card className="rounded-sm border-orange-200 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-warm-900 dark:text-cream-100">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Route Conflicts
              </CardTitle>
              <CardDescription className="text-xs text-warm-500 dark:text-cream-400">
                Managers with overlapping route windows on the same day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {routeConflicts.length === 0 ? (
                <p className="text-xs text-warm-500 dark:text-cream-400">No manager conflicts this week.</p>
              ) : (
                routeConflicts.slice(0, 6).map((conflict) => (
                  <div
                    key={`${conflict.dateKey}-${conflict.shiftIds.join('-')}`}
                    className="rounded-sm border border-orange-200 bg-white/80 p-2 text-xs dark:border-orange-950 dark:bg-charcoal-900"
                  >
                    <div className="font-medium text-warm-900 dark:text-cream-100">{conflict.managerName}</div>
                    <div className="mt-1 text-warm-500 dark:text-cream-400">
                      {format(new Date(`${conflict.dateKey}T12:00:00`), 'EEE, MMM d')}
                    </div>
                    <div className="mt-1 text-warm-500 dark:text-cream-400">{conflict.timeRange}</div>
                    <ManagerAssignmentDialog
                      mode="shift"
                      shiftId={conflict.reassignShiftId}
                      locationLabel={conflict.summary}
                      currentManagerId={conflict.managerId}
                      buttonLabel="Reassign Shift"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-sm border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-warm-900 dark:text-cream-100">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                Capacity & Window
              </CardTitle>
              <CardDescription className="text-xs text-warm-500 dark:text-cream-400">
                Routes that look overloaded or outside preferred service windows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {capacityWarnings.length === 0 ? (
                <p className="text-xs text-warm-500 dark:text-cream-400">No capacity warnings this week.</p>
              ) : (
                capacityWarnings.slice(0, 6).map((warning) => (
                  <div
                    key={`${warning.shiftId}-${warning.category}`}
                    className="rounded-sm border border-blue-200 bg-white/80 p-2 text-xs dark:border-blue-950 dark:bg-charcoal-900"
                  >
                    <div className="font-medium text-warm-900 dark:text-cream-100">{warning.managerName}</div>
                    <div className="mt-1 text-warm-500 dark:text-cream-400">
                      {format(new Date(`${warning.dateKey}T12:00:00`), 'EEE, MMM d')}
                    </div>
                    <div className="mt-1 text-warm-500 dark:text-cream-400">{warning.message}</div>
                    <ManagerAssignmentDialog
                      mode="shift"
                      shiftId={warning.shiftId}
                      locationLabel={warning.message}
                      currentManagerId={warning.managerId}
                      buttonLabel="Reassign Route"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100">
                Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardTitle>
              <CardDescription className="text-xs text-warm-500 dark:text-cream-400 mt-1">
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
                      ? 'bg-warm-50 dark:bg-charcoal-800 border-ocean-400'
                      : isPast
                        ? 'bg-warm-50/50 dark:bg-charcoal-950/50 opacity-75'
                        : 'border-warm-200 dark:border-charcoal-700'
                  }`}
                >
                  {/* Day Header */}
                  <div className="p-3 border-b border-warm-200 dark:border-charcoal-700 bg-warm-50 dark:bg-charcoal-800">
                    <div className="text-center">
                      <div className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-2xl font-bold text-warm-900 dark:text-cream-100 mt-1">
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
                        <p className="text-xs text-warm-500 dark:text-cream-400 italic">
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
                        {dayShifts.map((shift) => {
                          // Get locations from shiftLocations if available, otherwise fall back to single location
                          const locations =
                            shift.shiftLocations && shift.shiftLocations.length > 0
                              ? shift.shiftLocations.map((sl) => sl.location)
                              : shift.location
                                ? [shift.location]
                                : []

                          return (
                            <div
                              key={shift.id}
                              className="p-2 bg-white dark:bg-charcoal-900 border border-warm-200 dark:border-charcoal-700 rounded-sm hover:border-ocean-400 transition-colors text-xs"
                            >
                              <div className="font-medium text-sm text-warm-900 dark:text-cream-100 mb-1">
                                {shift.manager ? `${shift.manager.firstName} ${shift.manager.lastName}` : 'Unassigned manager'}
                              </div>
                              <div className="text-warm-500 dark:text-cream-400 mb-1">
                                {shift.startTime} - {shift.endTime}
                              </div>
                              {locations.length > 0 && (
                                <div className="text-warm-500 dark:text-cream-400 space-y-0.5">
                                  {locations.map((loc) => (
                                    <div key={loc.id} className="truncate" title={`${loc.client.name} - ${loc.name}`}>
                                      - {loc.name}
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
                                  <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 dark:border-charcoal-700">
                                    {locations.length} stops
                                  </Badge>
                                )}
                                {!shift.managerId && (
                                  <Badge className="rounded-sm bg-amber-100 px-1.5 py-0 text-[10px] text-amber-700 border-amber-200">
                                    Unassigned
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
            <div className="mt-6 pt-6 border-t border-warm-200 dark:border-charcoal-700">
              <h4 className="text-sm font-medium text-warm-700 dark:text-cream-300 mb-3">
                Associate Assignments (Recurring)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {assignments.map((assignment: ScheduleAssignment) => (
                  <div
                    key={assignment.id}
                    className="text-sm p-2 bg-warm-50 dark:bg-charcoal-800 rounded-sm border border-warm-200 dark:border-charcoal-700"
                  >
                    <span className="font-medium text-warm-900 dark:text-cream-100">
                      {assignment.user.firstName} {assignment.user.lastName}
                    </span>
                    <span className="text-warm-500 dark:text-cream-400">
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
      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
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

