'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  Users,
  AlertTriangle,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Edit2,
  Building2,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/format'
import { toast } from 'sonner'
import { AssignmentScheduleEditor } from '@/components/workforce/assignment-schedule-editor'

interface Account {
  assignmentId: string
  locationId: string
  locationName: string
  clientName: string
  clientId: string
  category: string | null
  monthlyPay: number
  accountRevenue: number
  estimatedHoursPerVisit: number
  nightsPerWeek: number
  estWeeklyHours: number
  cleaningWindowStart: string | null
  cleaningWindowEnd: string | null
  daysOfWeek: number[]
  startDate: string
}

interface Associate {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  startDate: string | null
  accounts: Account[]
  totalAccounts: number
  totalEstWeeklyHours: number
  totalMonthlyPay: number
  totalAccountRevenue: number
  hoursStatus: 'safe' | 'watch' | 'warning' | 'danger'
}

const DAY_LABELS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

/* Hours visual tone per the progress spec: green under 38h, gold 38–40h,
   coral at/over 40h. Visual only — compliance status comes from the API. */
type HoursTone = 'green' | 'gold' | 'coral'

function hoursTone(hours: number): HoursTone {
  if (hours >= 40) return 'coral'
  if (hours >= 38) return 'gold'
  return 'green'
}

const hoursBarFill: Record<HoursTone, string> = {
  green: 'bg-green-600 dark:bg-green-300',
  gold: 'bg-gold-600 dark:bg-gold-400',
  coral: 'bg-coral-600 dark:bg-coral-300',
}

function HoursChip({ hours }: { hours: number }) {
  return (
    <Badge variant={hoursTone(hours)} className="font-mono tabular-nums">
      {hours}h/40h
    </Badge>
  )
}

function HoursBar({ hours }: { hours: number }) {
  const pct = Math.min((hours / 40) * 100, 100)
  const overflow = hours > 40

  return (
    <div className="w-full">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            hoursBarFill[hoursTone(hours)],
            overflow && 'animate-pulse'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function formatWindow(start: string | null, end: string | null) {
  if (!start) return '—'
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return m === 0 ? `${h12}${ampm}` : `${h12}:${m.toString().padStart(2, '0')}${ampm}`
  }
  return `${fmt(start)}${end ? ` - ${fmt(end)}` : ''}`
}

function AssociateRow({ associate, onUpdate }: { associate: Associate; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [deleteAssociateOpen, setDeleteAssociateOpen] = useState(false)
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null)
  const [deleteAssignmentLabel, setDeleteAssignmentLabel] = useState('')

  const handleDeleteAssociate = async () => {
    try {
      // Deactivate all assignments first, then deactivate the user
      const res = await fetch(`/api/users/${associate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      if (!res.ok) throw new Error('Failed to deactivate associate')
      toast.success(`${associate.firstName} ${associate.lastName} removed`)
      onUpdate()
    } catch {
      toast.error('Failed to remove associate')
    }
    setDeleteAssociateOpen(false)
  }

  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentId) return
    try {
      const res = await fetch(`/api/location-assignments/${deleteAssignmentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete assignment')
      toast.success('Assignment removed')
      onUpdate()
    } catch {
      toast.error('Failed to remove assignment')
    }
    setDeleteAssignmentId(null)
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-soft dark:shadow-none">
      {/* Delete associate confirmation */}
      <AlertDialog open={deleteAssociateOpen} onOpenChange={setDeleteAssociateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {associate.firstName} {associate.lastName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate this associate and hide them from the workforce dashboard. Their data will be preserved for records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssociate}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete assignment confirmation */}
      <AlertDialog open={!!deleteAssignmentId} onOpenChange={(open) => !open && setDeleteAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {deleteAssignmentLabel} from {associate.firstName}&apos;s accounts? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssignment}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main row */}
      <div
        className={cn(
          'flex w-full items-center gap-4 px-4 py-3 text-left transition-colors',
          'hover:bg-secondary/40',
          expanded && 'bg-secondary/30'
        )}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 cursor-pointer"
          aria-label={expanded ? 'Collapse accounts' : 'Expand accounts'}
        >
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </button>

        {/* Avatar */}
        <button onClick={() => setExpanded(!expanded)} className={cn(
          'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-semibold',
          associate.hoursStatus === 'danger'
            ? 'bg-coral-600/10 text-coral-600 dark:bg-coral-300/12 dark:text-coral-300'
            : associate.hoursStatus === 'warning'
              ? 'bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400'
              : 'bg-secondary text-muted-foreground'
        )}>
          {associate.firstName[0]}{associate.lastName[0]}
        </button>

        {/* Name & meta */}
        <button onClick={() => setExpanded(!expanded)} className="min-w-0 flex-1 cursor-pointer text-left">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {associate.firstName} {associate.lastName}
            </span>
            {associate.hoursStatus === 'danger' && (
              <AlertTriangle className="size-3.5 shrink-0 text-coral-600 dark:text-coral-300" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="tabular-nums">{associate.totalAccounts}</span> account{associate.totalAccounts !== 1 ? 's' : ''}
            {associate.phone && <span className="ml-2 font-mono">{associate.phone}</span>}
          </div>
        </button>

        {/* Hours bar - wide screens */}
        <div className="hidden w-40 lg:block">
          <HoursBar hours={associate.totalEstWeeklyHours} />
        </div>

        {/* Hours chip */}
        <HoursChip hours={associate.totalEstWeeklyHours} />

        {/* Pay */}
        <div className="hidden w-24 text-right sm:block">
          <div className="font-mono text-sm font-medium tabular-nums text-foreground">
            {formatMoney(associate.totalMonthlyPay)}
          </div>
          <div className="text-[10px] text-muted-foreground">/month</div>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label={`Actions for ${associate.firstName} ${associate.lastName}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setDeleteAssociateOpen(true)}>
              <Trash2 className="size-4" />
              Remove Associate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded account details */}
      {expanded && (
        <div className="border-t border-border bg-secondary/20">
          {associate.accounts.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No accounts assigned yet"
              description="Assign this associate to a location from the Assignments page."
              className="py-8"
            />
          ) : (
            <div className="divide-y divide-border/60">
              {associate.accounts.map((account) => (
                <div
                  key={account.assignmentId}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/40"
                >
                  <div className="w-5" /> {/* spacer for alignment */}

                  <Building2 className="size-4 shrink-0 text-muted-foreground" />

                  {/* Account info */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {account.clientName} - {account.locationName}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      {account.category && (
                        <span className="capitalize">{account.category}</span>
                      )}
                      <span className="font-mono">{formatWindow(account.cleaningWindowStart, account.cleaningWindowEnd)}</span>
                    </div>
                  </div>

                  {/* Days of week pills */}
                  <div className="hidden items-center gap-0.5 md:flex">
                    {DAY_LABELS_SHORT.map((day, i) => (
                      <span
                        key={day}
                        className={cn(
                          'flex size-6 items-center justify-center rounded-[6px] font-mono text-[10px] font-medium',
                          account.daysOfWeek.includes(i)
                            ? 'bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400'
                            : 'bg-secondary text-muted-foreground/60'
                        )}
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Hours per visit */}
                  <div className="w-16 text-right">
                    <div className={cn(
                      'font-mono text-sm tabular-nums',
                      account.estimatedHoursPerVisit > 0 ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {account.estimatedHoursPerVisit > 0 ? `${account.estimatedHoursPerVisit}h` : '—'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">/visit</div>
                  </div>

                  {/* Weekly hours */}
                  <div className="w-16 text-right">
                    <div className={cn(
                      'font-mono text-sm font-medium tabular-nums',
                      account.estWeeklyHours > 0 ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {account.estWeeklyHours > 0 ? `${account.estWeeklyHours}h` : '—'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">/week</div>
                  </div>

                  {/* Pay */}
                  <div className="w-20 text-right">
                    <div className="font-mono text-sm tabular-nums text-foreground">
                      {formatMoney(account.monthlyPay)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">/month</div>
                  </div>

                  {/* Revenue */}
                  <div className="hidden w-20 text-right lg:block">
                    <div className="font-mono text-sm tabular-nums text-foreground">
                      {formatMoney(account.accountRevenue)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">revenue</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5">
                    <AssignmentScheduleEditor
                      assignmentId={account.assignmentId}
                      locationName={`${account.clientName} - ${account.locationName}`}
                      currentData={{
                        estimatedHoursPerVisit: account.estimatedHoursPerVisit,
                        cleaningWindowStart: account.cleaningWindowStart || '',
                        cleaningWindowEnd: account.cleaningWindowEnd || '',
                        daysOfWeek: account.daysOfWeek,
                        nightsPerWeek: account.nightsPerWeek,
                        monthlyPay: account.monthlyPay,
                      }}
                      onSaved={onUpdate}
                    >
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit schedule for ${account.locationName}`}>
                        <Edit2 className="size-4" />
                      </Button>
                    </AssignmentScheduleEditor>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${account.locationName}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => {
                            setDeleteAssignmentLabel(`${account.clientName} - ${account.locationName}`)
                            setDeleteAssignmentId(account.assignmentId)
                          }}
                        >
                          <Trash2 className="size-4" />
                          Remove Assignment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilterTab({
  active,
  onClick,
  label,
  count,
  countClass,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  countClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px inline-flex cursor-pointer items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
      <span className={cn('font-mono text-xs tabular-nums', countClass ?? 'text-muted-foreground')}>
        {count}
      </span>
    </button>
  )
}

export function WorkforceDashboard() {
  const [associates, setAssociates] = useState<Associate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'danger' | 'warning' | 'watch'>('all')
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/operations/workforce')
      if (res.ok) {
        const data = await res.json()
        setAssociates(data)
      }
    } catch (err) {
      console.error('Failed to fetch workforce data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUpdate = () => {
    fetchData()
    router.refresh()
  }

  // Stats
  const totalAssociates = associates.length
  const dangerCount = associates.filter((a) => a.hoursStatus === 'danger').length
  const warningCount = associates.filter((a) => a.hoursStatus === 'warning').length
  const watchCount = associates.filter((a) => a.hoursStatus === 'watch').length
  const totalMonthlyPayroll = associates.reduce((sum, a) => sum + a.totalMonthlyPay, 0)
  const totalMonthlyRevenue = associates.reduce((sum, a) => sum + a.totalAccountRevenue, 0)

  // Filter
  const filtered = filter === 'all'
    ? associates
    : associates.filter((a) => a.hoursStatus === filter)

  // Sort: danger first, then warning, then watch, then safe
  const statusOrder = { danger: 0, warning: 1, watch: 2, safe: 3 }
  const sorted = [...filtered].sort((a, b) => statusOrder[a.hoursStatus] - statusOrder[b.hoursStatus])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-[14px]" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 rounded-[14px]" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="OPERATIONS · WEEKLY HOURS"
        title="Workforce"
        subtitle="Monitor associate hours, account assignments, and overtime exposure"
        className="mb-0"
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Associates"
          value={totalAssociates}
          icon={Users}
          sub="On the roster"
        />

        <button
          type="button"
          onClick={() => setFilter(filter === 'danger' ? 'all' : 'danger')}
          className="w-full cursor-pointer rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <StatCard
            label="Over 40h"
            value={dangerCount}
            icon={AlertTriangle}
            tone={dangerCount > 0 ? 'coral' : 'neutral'}
            sub="Overtime exposure"
            className="h-full"
          />
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
          className="w-full cursor-pointer rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <StatCard
            label="Near 40h"
            value={warningCount}
            icon={Clock}
            tone={warningCount > 0 ? 'gold' : 'neutral'}
            sub="38-40h scheduled"
            className="h-full"
          />
        </button>

        <StatCard
          label="Monthly Payroll"
          value={
            <span className="font-mono tracking-normal">{formatMoney(totalMonthlyPayroll)}</span>
          }
          icon={DollarSign}
          sub={
            totalMonthlyRevenue > 0 ? (
              <span>
                <span className="font-mono tabular-nums text-green-600 dark:text-green-300">
                  {formatMoney(totalMonthlyRevenue)}
                </span>{' '}
                account revenue
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Filter tabs */}
      {(dangerCount > 0 || warningCount > 0 || watchCount > 0) && (
        <div className="flex items-center gap-5 border-b border-border">
          <FilterTab
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="All"
            count={totalAssociates}
          />
          {dangerCount > 0 && (
            <FilterTab
              active={filter === 'danger'}
              onClick={() => setFilter(filter === 'danger' ? 'all' : 'danger')}
              label="Over 40h"
              count={dangerCount}
              countClass="text-coral-600 dark:text-coral-300"
            />
          )}
          {warningCount > 0 && (
            <FilterTab
              active={filter === 'warning'}
              onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
              label="Near 40h"
              count={warningCount}
              countClass="text-gold-600 dark:text-gold-400"
            />
          )}
          {watchCount > 0 && (
            <FilterTab
              active={filter === 'watch'}
              onClick={() => setFilter(filter === 'watch' ? 'all' : 'watch')}
              label="32-38h"
              count={watchCount}
              countClass="text-teal-600 dark:text-teal-300"
            />
          )}
        </div>
      )}

      {/* Associate list */}
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <Card className="py-0">
            <EmptyState
              icon={Users}
              title={
                filter !== 'all'
                  ? 'Nobody in this range right now'
                  : 'No associates on the roster yet'
              }
              description={
                filter !== 'all'
                  ? 'No associates match this filter. Clear it to see the full roster.'
                  : 'Add associates on the Team page, then assign them to locations under Assignments.'
              }
            />
          </Card>
        ) : (
          sorted.map((associate) => (
            <AssociateRow
              key={associate.id}
              associate={associate}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>
    </div>
  )
}
