'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, MoreHorizontal, Calendar, Edit, Snowflake, X } from 'lucide-react'
import { toast } from 'sonner'
import { FacilityStatusBadge } from '@/components/clients/facility-status-badge'
import { FacilityProfileForm } from '@/components/forms/facility-profile-form'
import { SeasonalRuleForm } from '@/components/forms/seasonal-rule-form'
import { MonthlyOverrideForm } from '@/components/forms/monthly-override-form'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDays(days: number[]): string {
  if (days.length === 0) return '-'
  if (days.length === 7) return 'Every day'

  const sorted = [...days].sort((a, b) => a - b)

  // Check for Mon-Fri
  if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') return 'Mon-Fri'
  // Check for Mon-Sat
  if (sorted.length === 6 && sorted.join(',') === '1,2,3,4,5,6') return 'Mon-Sat'

  return sorted.map(d => DAY_LABELS[d]).join(', ')
}

function formatRate(rate: number | string): string {
  const num = typeof rate === 'string' ? parseFloat(rate) : rate
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

interface FacilitiesTabProps {
  clientId: string
  facilities: any[]
  locations: any[]
}

export function FacilitiesTab({ clientId, facilities, locations }: FacilitiesTabProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  // Locations without a facility profile (available for new profiles)
  const availableLocations = locations.filter(
    (loc: any) => !facilities.some((f: any) => f.locationId === loc.id)
  )

  const handleQuickStatusChange = async (facilityId: string, newStatus: string) => {
    setUpdating(facilityId)
    try {
      const res = await fetch(`/api/clients/${clientId}/facilities/${facilityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }
      toast.success(`Facility ${newStatus === 'ACTIVE' ? 'activated' : newStatus === 'PAUSED' ? 'paused' : 'updated'}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update facility')
    } finally {
      setUpdating(null)
    }
  }

  const activeFacilities = facilities.filter((f: any) => f.status === 'ACTIVE')
  const activeTotal = activeFacilities.reduce(
    (sum: number, f: any) => sum + (typeof f.defaultMonthlyRate === 'string' ? parseFloat(f.defaultMonthlyRate) : f.defaultMonthlyRate),
    0
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Facilities</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeFacilities.length} of {facilities.length} active ·{' '}
              <span className="font-mono font-medium tabular-nums text-foreground">
                {formatRate(activeTotal)}
              </span>
              /mo
            </p>
          </div>
          {availableLocations.length > 0 && (
            <FacilityProfileForm
              clientId={clientId}
              availableLocations={availableLocations}
            >
              <Button variant="gold" size="sm">
                <Plus className="size-4" />
                Add Facility
              </Button>
            </FacilityProfileForm>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {facilities.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No facilities configured"
            description="Add facility profiles to locations to manage billing and scheduling."
            action={
              availableLocations.length > 0 ? (
                <FacilityProfileForm
                  clientId={clientId}
                  availableLocations={availableLocations}
                >
                  <Button variant="outline">
                    <Plus className="size-4" />
                    Add First Facility
                  </Button>
                </FacilityProfileForm>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add locations to this client first, then configure facility profiles.
                </p>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Facility</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Monthly Rate</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Seasonal</TableHead>
                  <TableHead>Overrides</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facilities.map((facility: any) => (
                  <TableRow key={facility.id}>
                    <TableCell className="font-medium text-foreground">
                      {facility.location?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {facility.category ? (
                        <Badge variant="neutral" className="capitalize">
                          {facility.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(facility.status === 'ACTIVE' || facility.status === 'PAUSED') ? (
                          <Switch
                            checked={facility.status === 'ACTIVE'}
                            disabled={updating === facility.id}
                            onCheckedChange={(checked) =>
                              handleQuickStatusChange(facility.id, checked ? 'ACTIVE' : 'PAUSED')
                            }
                          />
                        ) : (
                          <FacilityStatusBadge status={facility.status} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-foreground">
                      {formatRate(facility.defaultMonthlyRate)}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      {facility.normalFrequencyPerWeek > 0
                        ? `${facility.normalFrequencyPerWeek}x/week`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDays(facility.normalDaysOfWeek)}
                    </TableCell>
                    <TableCell>
                      {facility.seasonalRulesEnabled && facility.seasonalRules?.length > 0 ? (
                        <Badge variant="teal">
                          <Snowflake className="h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <OverrideIndicator overrides={facility.monthlyOverrides || []} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={updating === facility.id}
                            aria-label={`Actions for ${facility.location?.name || 'facility'}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <FacilityProfileForm
                            clientId={clientId}
                            availableLocations={availableLocations}
                            facility={facility}
                          >
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Edit className="size-4" />
                              Edit Facility
                            </DropdownMenuItem>
                          </FacilityProfileForm>
                          <DropdownMenuSeparator />
                          <SeasonalRuleForm
                            clientId={clientId}
                            facilityId={facility.id}
                            facilityName={facility.location?.name}
                          >
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Snowflake className="size-4" />
                              Seasonal Rules
                            </DropdownMenuItem>
                          </SeasonalRuleForm>
                          <MonthlyOverrideForm
                            clientId={clientId}
                            facilityId={facility.id}
                            facilityName={facility.location?.name}
                          >
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Calendar className="size-4" />
                              Add Override
                            </DropdownMenuItem>
                          </MonthlyOverrideForm>
                          {facility.status !== 'CLOSED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleQuickStatusChange(facility.id, 'CLOSED')}
                              >
                                <X className="size-4" />
                                Close Facility
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OverrideIndicator({ overrides }: { overrides: any[] }) {
  if (overrides.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  return (
    <div className="flex flex-wrap gap-1">
      {overrides.map((o: any) => {
        const isCurrent = o.year === currentYear && o.month === currentMonth
        const isPast = o.year < currentYear || (o.year === currentYear && o.month < currentMonth)

        let detail = ''
        if (o.overrideStatus) detail = o.overrideStatus.toLowerCase()
        else if (o.pauseStartDay && o.pauseEndDay) detail = `pause ${o.pauseStartDay}–${o.pauseEndDay}`
        else if (o.overrideRate !== null && o.overrideRate !== undefined) detail = 'rate'

        return (
          <Badge
            key={o.id}
            title={detail ? `${MONTH_SHORT[o.month]} ${o.year}: ${detail}` : `${MONTH_SHORT[o.month]} ${o.year}`}
            variant={isCurrent ? 'gold' : isPast ? 'neutral' : 'teal'}
            className="cursor-default font-mono"
          >
            <Calendar className="h-2.5 w-2.5" />
            {MONTH_SHORT[o.month]}
            {o.year !== currentYear && ` '${String(o.year).slice(2)}`}
          </Badge>
        )
      })}
    </div>
  )
}
