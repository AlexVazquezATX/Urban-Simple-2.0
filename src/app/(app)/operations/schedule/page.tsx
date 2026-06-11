import { Suspense } from 'react'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CalendarX,
  UserX,
  Route,
  CalendarCheck,
  Wrench,
} from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/page-header'
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

function crewInitials(firstName?: string | null, lastName?: string | null) {
  const text = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
  return text || '?'
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
      deletedAt: null,
      client: {
        companyId: user.companyId,
        deletedAt: null,
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
    <div>
      <PageHeader
        kicker={`OPERATIONS · WEEK OF ${format(weekStart, 'MMM d').toUpperCase()}`}
        title="Schedule"
        subtitle="Manager routes and associate assignments for the week"
        actions={
          <>
            <ShiftForm defaultDate={today.toISOString().split('T')[0]}>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Schedule Manager
              </Button>
            </ShiftForm>
            <DispatchGenerateButton rangeStart={weekStart.toISOString().split('T')[0]} />
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Dispatch Ready"
            icon={Route}
            value={dispatchReadyLocations.length}
            sub={`${dueThisWeekCount} auto-route location${dueThisWeekCount === 1 ? '' : 's'} due this week`}
          />
          <StatCard
            label="Needs Setup"
            icon={Wrench}
            tone={dispatchNeedsSetup.length > 0 ? 'gold' : 'neutral'}
            value={
              dispatchNeedsSetup.length === 0 ? (
                <span className="text-muted-foreground">0</span>
              ) : (
                dispatchNeedsSetup.length
              )
            }
            sub="Missing default manager or service days"
          />
          <StatCard
            label="Manager Routes"
            icon={CalendarCheck}
            value={managerShifts.length}
            sub="Generated and manual manager review shifts this week"
          />
          <StatCard
            label="Exceptions"
            icon={AlertTriangle}
            tone={exceptionCount > 0 ? 'coral' : 'neutral'}
            value={
              exceptionCount === 0 ? (
                <span className="text-muted-foreground">0</span>
              ) : (
                exceptionCount
              )
            }
            sub={`${coverageGaps.length} uncovered, ${unassignedRoutes.length} unassigned, ${routeConflicts.length} conflicting, ${capacityWarnings.length} capacity`}
          />
        </div>

        {dispatchNeedsSetup.length > 0 && (
          <Card className="border-gold-600/30 bg-gold-600/10 dark:border-gold-400/25 dark:bg-gold-400/12">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[15px]">Dispatch Setup Needed</CardTitle>
              <CardDescription className="text-xs">
                These locations are marked for auto-routing but still need dispatch inputs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-2">
                {dispatchNeedsSetup.slice(0, 8).map((location) => (
                  <Link key={location.id} href={`/locations/${location.id}`}>
                    <Badge variant="gold">
                      {location.client.name} - {location.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {exceptionCount > 0 && (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <Card className="border-coral-600/30 bg-coral-600/10 dark:border-coral-300/25 dark:bg-coral-300/12">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <CalendarX className="h-4 w-4 text-coral-600 dark:text-coral-300" />
                  Uncovered Stops
                </CardTitle>
                <CardDescription className="text-xs">
                  Auto-route locations due this week with no manager route scheduled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {coverageGaps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No uncovered stops this week.</p>
                ) : (
                  coverageGaps.slice(0, 6).map((gap) => (
                    <div
                      key={`${gap.dateKey}-${gap.locationId}`}
                      className="rounded-[10px] border border-border bg-card p-2 text-xs"
                    >
                      <Link
                        href={`/locations/${gap.locationId}`}
                        className="block transition-colors hover:text-foreground"
                      >
                        <div className="font-medium text-foreground">
                          {gap.clientName} - {gap.locationName}
                        </div>
                        <div className="mt-1 font-mono tabular-nums text-muted-foreground">
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

            <Card className="border-gold-600/30 bg-gold-600/10 dark:border-gold-400/25 dark:bg-gold-400/12">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <UserX className="h-4 w-4 text-gold-600 dark:text-gold-400" />
                  Unassigned Routes
                </CardTitle>
                <CardDescription className="text-xs">
                  Shift records without a manager assignment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {unassignedRoutes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No unassigned routes this week.</p>
                ) : (
                  unassignedRoutes.slice(0, 6).map((route) => {
                    const shift = shifts.find((entry) => entry.id === route.shiftId)
                    if (!shift) {
                      return null
                    }

                    return (
                      <div
                        key={route.shiftId}
                        className="rounded-[10px] border border-border bg-card p-2 text-xs"
                      >
                        <div className="font-medium font-mono tabular-nums text-foreground">
                          {format(new Date(`${route.dateKey}T12:00:00`), 'EEE, MMM d')} - {route.timeRange}
                        </div>
                        <div className="mt-1 text-muted-foreground">{route.locationSummary}</div>
                        <ShiftForm shift={shift}>
                          <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs">
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

            <Card className="border-coral-600/30 bg-coral-600/10 dark:border-coral-300/25 dark:bg-coral-300/12">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <AlertTriangle className="h-4 w-4 text-coral-600 dark:text-coral-300" />
                  Route Conflicts
                </CardTitle>
                <CardDescription className="text-xs">
                  Managers with overlapping route windows on the same day.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {routeConflicts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No manager conflicts this week.</p>
                ) : (
                  routeConflicts.slice(0, 6).map((conflict) => (
                    <div
                      key={`${conflict.dateKey}-${conflict.shiftIds.join('-')}`}
                      className="rounded-[10px] border border-border bg-card p-2 text-xs"
                    >
                      <div className="font-medium text-foreground">{conflict.managerName}</div>
                      <div className="mt-1 font-mono tabular-nums text-muted-foreground">
                        {format(new Date(`${conflict.dateKey}T12:00:00`), 'EEE, MMM d')}
                      </div>
                      <div className="mt-1 font-mono tabular-nums text-muted-foreground">{conflict.timeRange}</div>
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

            <Card className="border-teal-600/30 bg-teal-600/10 dark:border-teal-300/25 dark:bg-teal-300/12">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <AlertTriangle className="h-4 w-4 text-teal-600 dark:text-teal-300" />
                  Capacity & Window
                </CardTitle>
                <CardDescription className="text-xs">
                  Routes that look overloaded or outside preferred service windows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {capacityWarnings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No capacity warnings this week.</p>
                ) : (
                  capacityWarnings.slice(0, 6).map((warning) => (
                    <div
                      key={`${warning.shiftId}-${warning.category}`}
                      className="rounded-[10px] border border-border bg-card p-2 text-xs"
                    >
                      <div className="font-medium text-foreground">{warning.managerName}</div>
                      <div className="mt-1 font-mono tabular-nums text-muted-foreground">
                        {format(new Date(`${warning.dateKey}T12:00:00`), 'EEE, MMM d')}
                      </div>
                      <div className="mt-1 text-muted-foreground">{warning.message}</div>
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

        <Card>
          <CardHeader className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>
                  Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {managerShifts.length} manager{' '}
                  {managerShifts.length === 1 ? 'shift' : 'shifts'} scheduled
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/operations/schedule?week=${currentWeekOffset - 1}`}>
                  <Button variant="ghost" size="sm">
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
                  <Button variant="ghost" size="sm">
                    Next Week
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {/* Week strip - 7 day columns (Sun-Sat) */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dateKey = day.toISOString().split('T')[0]
                const dayShifts = shiftsByDate[dateKey] || []
                const isToday = isSameDay(day, today)
                const isPast = day < today && !isToday

                return (
                  <div
                    key={dateKey}
                    className={`flex min-h-100 flex-col overflow-hidden rounded-[12px] border ${
                      isToday
                        ? 'border-gold-600/40 dark:border-gold-400/40'
                        : isPast
                          ? 'border-border bg-secondary/30 opacity-70'
                          : 'border-border'
                    }`}
                  >
                    {/* Day Header */}
                    <div
                      className={`border-b p-3 ${
                        isToday
                          ? 'border-gold-600/30 bg-gold-600/10 dark:border-gold-400/25 dark:bg-gold-400/12'
                          : 'border-border bg-secondary/50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="kicker text-muted-foreground">
                          {format(day, 'EEE')}
                        </div>
                        <div className="mt-1 font-display text-2xl font-bold tabular-nums tracking-[-0.5px] text-foreground">
                          {format(day, 'd')}
                        </div>
                        {isToday && (
                          <Badge variant="gold" className="mt-1 px-1.5 text-[10px]">
                            Today
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Day Content */}
                    <div className="flex-1 space-y-2 overflow-y-auto p-2">
                      {/* Manager Shifts */}
                      {dayShifts.length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-xs text-muted-foreground">
                            No shifts
                          </p>
                          {!isPast && (
                            <ShiftForm defaultDate={dateKey}>
                              <Button variant="ghost" size="sm" className="mt-2">
                                <Plus className="mr-1 h-3 w-3" />
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
                            const crew = [
                              ...(shift.manager ? [shift.manager] : []),
                              ...(shift.associate ? [shift.associate] : []),
                            ]

                            return (
                              <div
                                key={shift.id}
                                className="rounded-[11px] border border-border bg-card p-2 text-xs shadow-soft transition-colors hover:border-gold-600/40 dark:shadow-none dark:hover:border-gold-400/40"
                              >
                                <div className="font-mono text-xs font-medium tabular-nums text-gold-600 dark:text-gold-400">
                                  {shift.startTime} - {shift.endTime}
                                </div>
                                {locations.length > 0 && (
                                  <div className="mt-1 space-y-0.5 text-muted-foreground">
                                    {locations.map((loc) => (
                                      <div key={loc.id} className="truncate" title={`${loc.client.name} - ${loc.name}`}>
                                        <span className="font-medium text-foreground">{loc.client.name}</span>
                                        {' · '}
                                        {loc.name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {crew.length > 0 ? (
                                  <div className="mt-2 flex items-center">
                                    {crew.map((person, index) => (
                                      <div
                                        key={person.id}
                                        className={`grid size-6 shrink-0 place-items-center rounded-full border-2 border-card bg-ink-800 text-[9px] font-bold text-cream-100 dark:bg-cream-200 dark:text-ink-900 ${
                                          index > 0 ? '-ml-2' : ''
                                        }`}
                                        title={`${person.firstName} ${person.lastName}`}
                                      >
                                        {crewInitials(person.firstName, person.lastName)}
                                      </div>
                                    ))}
                                    {shift.manager && (
                                      <span className="ml-1.5 truncate text-[11px] text-muted-foreground">
                                        {shift.manager.firstName} {shift.manager.lastName}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mt-2 text-[11px] text-muted-foreground">
                                    Unassigned manager
                                  </div>
                                )}
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <Badge
                                    variant={
                                      shift.status === 'completed'
                                        ? 'green'
                                        : shift.status === 'missed'
                                          ? 'coral'
                                          : 'neutral'
                                    }
                                    className="px-1.5 text-[10px]"
                                  >
                                    {shift.status}
                                  </Badge>
                                  {locations.length > 1 && (
                                    <Badge variant="neutral" className="px-1.5 font-mono text-[10px] tabular-nums">
                                      {locations.length} stops
                                    </Badge>
                                  )}
                                  {!shift.managerId && (
                                    <Badge variant="gold" className="px-1.5 text-[10px]">
                                      Unassigned
                                    </Badge>
                                  )}
                                </div>
                                {!isPast && (
                                  <ShiftForm shift={shift}>
                                    <Button variant="ghost" size="sm" className="mt-2 h-7 w-full text-xs">
                                      Edit
                                    </Button>
                                  </ShiftForm>
                                )}
                              </div>
                            )
                          })}
                          {!isPast && (
                            <ShiftForm defaultDate={dateKey}>
                              <Button variant="ghost" size="sm" className="w-full text-xs">
                                <Plus className="mr-1 h-3 w-3" />
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
              <div className="mt-6 border-t border-border pt-6">
                <h4 className="kicker mb-3 text-muted-foreground">
                  Associate Assignments · Recurring
                </h4>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {assignments.map((assignment: ScheduleAssignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-[10px] border border-border bg-secondary/50 p-2 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {assignment.user.firstName} {assignment.user.lastName}
                      </span>
                      <span className="text-muted-foreground">
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
    </div>
  )
}

function ScheduleViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Card>
        <CardHeader className="p-4">
          <Skeleton className="mb-2 h-5 w-64" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-80 w-full rounded-[12px]" />
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
