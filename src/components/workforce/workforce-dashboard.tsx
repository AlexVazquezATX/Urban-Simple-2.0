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
  Plus,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function HoursBadge({ hours, status }: { hours: number; status: string }) {
  const colorMap: Record<string, string> = {
    safe: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    watch: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
    warning: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    danger: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  }

  return (
    <Badge className={cn('rounded-sm text-xs font-semibold tabular-nums px-2 py-0.5 border', colorMap[status] || colorMap.safe)}>
      {hours}h / 40h
    </Badge>
  )
}

function HoursBar({ hours }: { hours: number }) {
  const pct = Math.min((hours / 40) * 100, 100)
  const overflow = hours > 40

  let barColor = 'bg-emerald-500'
  if (hours >= 40) barColor = 'bg-red-500'
  else if (hours >= 38) barColor = 'bg-amber-500'
  else if (hours >= 32) barColor = 'bg-sky-500'

  return (
    <div className="w-full">
      <div className="w-full h-2 rounded-full bg-warm-200 dark:bg-charcoal-700 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor, overflow && 'animate-pulse')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function formatWindow(start: string | null, end: string | null) {
  if (!start) return '-'
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
    <div className="border border-warm-200 dark:border-charcoal-700 rounded-sm overflow-hidden">
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
            <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssociate} className="rounded-sm bg-red-600 hover:bg-red-700">
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
            <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssignment} className="rounded-sm bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main row */}
      <div
        className={cn(
          'w-full flex items-center gap-4 px-4 py-3 text-left transition-colors',
          'hover:bg-warm-50 dark:hover:bg-charcoal-800/50',
          expanded && 'bg-warm-50 dark:bg-charcoal-800/30'
        )}
      >
        <button onClick={() => setExpanded(!expanded)} className="shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-warm-400 dark:text-cream-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-warm-400 dark:text-cream-500" />
          )}
        </button>

        {/* Avatar */}
        <button onClick={() => setExpanded(!expanded)} className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0',
          associate.hoursStatus === 'danger'
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : associate.hoursStatus === 'warning'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-warm-200 text-warm-700 dark:bg-charcoal-700 dark:text-cream-300'
        )}>
          {associate.firstName[0]}{associate.lastName[0]}
        </button>

        {/* Name & meta */}
        <button onClick={() => setExpanded(!expanded)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-warm-900 dark:text-cream-100 truncate">
              {associate.firstName} {associate.lastName}
            </span>
            {associate.hoursStatus === 'danger' && (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
          </div>
          <div className="text-xs text-warm-500 dark:text-cream-400">
            {associate.totalAccounts} account{associate.totalAccounts !== 1 ? 's' : ''}
            {associate.phone && <span className="ml-2">{associate.phone}</span>}
          </div>
        </button>

        {/* Hours bar - wide screens */}
        <div className="hidden lg:block w-40">
          <HoursBar hours={associate.totalEstWeeklyHours} />
        </div>

        {/* Hours badge */}
        <HoursBadge hours={associate.totalEstWeeklyHours} status={associate.hoursStatus} />

        {/* Pay */}
        <div className="hidden sm:block text-right w-24">
          <div className="text-sm font-medium text-warm-900 dark:text-cream-100 tabular-nums">
            ${associate.totalMonthlyPay.toLocaleString()}
          </div>
          <div className="text-[10px] text-warm-500 dark:text-cream-400">/month</div>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-sm h-7 w-7 p-0 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
              onClick={() => setDeleteAssociateOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Remove Associate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded account details */}
      {expanded && (
        <div className="border-t border-warm-200 dark:border-charcoal-700 bg-warm-50/50 dark:bg-charcoal-800/20">
          {associate.accounts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-warm-500 dark:text-cream-400">
              No accounts assigned yet
            </div>
          ) : (
            <div className="divide-y divide-warm-100 dark:divide-charcoal-700/50">
              {associate.accounts.map((account) => (
                <div
                  key={account.assignmentId}
                  className="px-4 py-3 flex items-center gap-4 hover:bg-warm-100/50 dark:hover:bg-charcoal-800/40 transition-colors"
                >
                  <div className="w-5" /> {/* spacer for alignment */}

                  <Building2 className="h-4 w-4 text-warm-400 dark:text-cream-500 shrink-0" />

                  {/* Account info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-warm-800 dark:text-cream-200 truncate">
                      {account.clientName} - {account.locationName}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-warm-500 dark:text-cream-400 mt-0.5">
                      {account.category && (
                        <span className="capitalize">{account.category}</span>
                      )}
                      <span>{formatWindow(account.cleaningWindowStart, account.cleaningWindowEnd)}</span>
                    </div>
                  </div>

                  {/* Days of week pills */}
                  <div className="hidden md:flex items-center gap-0.5">
                    {DAY_LABELS_SHORT.map((day, i) => (
                      <span
                        key={day}
                        className={cn(
                          'w-6 h-6 rounded-sm text-[10px] font-medium flex items-center justify-center',
                          account.daysOfWeek.includes(i)
                            ? 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400'
                            : 'bg-warm-100 text-warm-400 dark:bg-charcoal-700 dark:text-charcoal-500'
                        )}
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Hours per visit */}
                  <div className="text-right w-16">
                    <div className="text-sm tabular-nums text-warm-800 dark:text-cream-200">
                      {account.estimatedHoursPerVisit > 0 ? `${account.estimatedHoursPerVisit}h` : '-'}
                    </div>
                    <div className="text-[10px] text-warm-500 dark:text-cream-400">/visit</div>
                  </div>

                  {/* Weekly hours */}
                  <div className="text-right w-16">
                    <div className="text-sm font-medium tabular-nums text-warm-800 dark:text-cream-200">
                      {account.estWeeklyHours > 0 ? `${account.estWeeklyHours}h` : '-'}
                    </div>
                    <div className="text-[10px] text-warm-500 dark:text-cream-400">/week</div>
                  </div>

                  {/* Pay */}
                  <div className="text-right w-20">
                    <div className="text-sm tabular-nums text-warm-800 dark:text-cream-200">
                      ${account.monthlyPay.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-warm-500 dark:text-cream-400">/month</div>
                  </div>

                  {/* Revenue */}
                  <div className="hidden lg:block text-right w-20">
                    <div className="text-sm tabular-nums text-warm-800 dark:text-cream-200">
                      ${account.accountRevenue.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-warm-500 dark:text-cream-400">revenue</div>
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
                      <Button variant="ghost" size="sm" className="rounded-sm h-7 w-7 p-0">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </AssignmentScheduleEditor>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-sm h-7 w-7 p-0 text-warm-400 hover:text-red-600 dark:text-charcoal-500 dark:hover:text-red-400"
                      onClick={() => {
                        setDeleteAssignmentLabel(`${account.clientName} - ${account.locationName}`)
                        setDeleteAssignmentId(account.assignmentId)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
          <Skeleton className="h-8 w-72 mb-2 rounded-sm" />
          <Skeleton className="h-4 w-96 rounded-sm" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-sm" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 rounded-sm" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">
            Workforce
          </h1>
          <p className="text-sm text-warm-500 dark:text-cream-400 mt-1">
            Monitor associate hours, account assignments, and overtime exposure
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-warm-100 dark:bg-charcoal-800">
                <Users className="h-4 w-4 text-warm-600 dark:text-cream-400" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-warm-900 dark:text-cream-100 tabular-nums">{totalAssociates}</div>
                <div className="text-xs text-warm-500 dark:text-cream-400">Active Associates</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          'rounded-sm border cursor-pointer transition-colors',
          dangerCount > 0
            ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20'
            : 'border-warm-200 dark:border-charcoal-700'
        )} onClick={() => setFilter(filter === 'danger' ? 'all' : 'danger')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-sm', dangerCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-warm-100 dark:bg-charcoal-800')}>
                <AlertTriangle className={cn('h-4 w-4', dangerCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-warm-600 dark:text-cream-400')} />
              </div>
              <div>
                <div className={cn('text-2xl font-semibold tabular-nums', dangerCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-warm-900 dark:text-cream-100')}>
                  {dangerCount}
                </div>
                <div className="text-xs text-warm-500 dark:text-cream-400">Over 40h</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          'rounded-sm border cursor-pointer transition-colors',
          warningCount > 0
            ? 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20'
            : 'border-warm-200 dark:border-charcoal-700'
        )} onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-sm', warningCount > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-warm-100 dark:bg-charcoal-800')}>
                <Clock className={cn('h-4 w-4', warningCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-warm-600 dark:text-cream-400')} />
              </div>
              <div>
                <div className={cn('text-2xl font-semibold tabular-nums', warningCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-warm-900 dark:text-cream-100')}>
                  {warningCount}
                </div>
                <div className="text-xs text-warm-500 dark:text-cream-400">Near 40h (38-40)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-warm-100 dark:bg-charcoal-800">
                <DollarSign className="h-4 w-4 text-warm-600 dark:text-cream-400" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-warm-900 dark:text-cream-100 tabular-nums">
                  ${Math.round(totalMonthlyPayroll).toLocaleString()}
                </div>
                <div className="text-xs text-warm-500 dark:text-cream-400">
                  Monthly Payroll
                  {totalMonthlyRevenue > 0 && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                      / ${Math.round(totalMonthlyRevenue).toLocaleString()} rev
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      {(dangerCount > 0 || warningCount > 0 || watchCount > 0) && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
              filter === 'all'
                ? 'bg-warm-900 text-cream-100 dark:bg-cream-100 dark:text-charcoal-900'
                : 'text-warm-600 dark:text-cream-400 hover:bg-warm-100 dark:hover:bg-charcoal-800'
            )}
          >
            All ({totalAssociates})
          </button>
          {dangerCount > 0 && (
            <button
              onClick={() => setFilter(filter === 'danger' ? 'all' : 'danger')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
                filter === 'danger'
                  ? 'bg-red-600 text-white'
                  : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50'
              )}
            >
              Over 40h ({dangerCount})
            </button>
          )}
          {warningCount > 0 && (
            <button
              onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
                filter === 'warning'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50'
              )}
            >
              Near 40h ({warningCount})
            </button>
          )}
          {watchCount > 0 && (
            <button
              onClick={() => setFilter(filter === 'watch' ? 'all' : 'watch')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
                filter === 'watch'
                  ? 'bg-sky-600 text-white'
                  : 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-950/50'
              )}
            >
              32-38h ({watchCount})
            </button>
          )}
        </div>
      )}

      {/* Associate list */}
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardContent className="p-12 text-center">
              <Users className="h-10 w-10 mx-auto text-warm-300 dark:text-charcoal-600 mb-3" />
              <p className="text-warm-500 dark:text-cream-400 text-sm">
                {filter !== 'all'
                  ? 'No associates match this filter'
                  : 'No active associates found. Add associates via the Team page and assign them to locations via Assignments.'}
              </p>
            </CardContent>
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
