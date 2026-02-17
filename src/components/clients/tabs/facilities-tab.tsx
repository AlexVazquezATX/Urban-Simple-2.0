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
import { Plus, MoreHorizontal, Calendar, Edit, Snowflake, X } from 'lucide-react'
import { toast } from 'sonner'
import { FacilityStatusBadge } from '@/components/clients/facility-status-badge'
import { FacilityProfileForm } from '@/components/forms/facility-profile-form'
import { SeasonalRuleForm } from '@/components/forms/seasonal-rule-form'
import { MonthlyOverrideForm } from '@/components/forms/monthly-override-form'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
    <Card className="rounded-sm border-warm-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display font-medium text-warm-900">
              Facilities
            </CardTitle>
            <p className="text-sm text-warm-500 mt-1">
              {activeFacilities.length} of {facilities.length} active · <span className="font-medium text-warm-700">{formatRate(activeTotal)}</span>/mo
            </p>
          </div>
          {availableLocations.length > 0 && (
            <FacilityProfileForm
              clientId={clientId}
              availableLocations={availableLocations}
            >
              <Button variant="lime" size="sm" className="rounded-sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Facility
              </Button>
            </FacilityProfileForm>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {facilities.length === 0 ? (
          <div className="text-center py-12 text-warm-500">
            <Calendar className="mx-auto h-16 w-16 mb-4 text-warm-400" />
            <p className="text-lg font-medium mb-2 text-warm-700">
              No facilities configured
            </p>
            <p className="text-sm mb-4">
              Add facility profiles to locations for billing & scheduling management
            </p>
            {availableLocations.length > 0 ? (
              <FacilityProfileForm
                clientId={clientId}
                availableLocations={availableLocations}
              >
                <Button variant="outline" className="rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Facility
                </Button>
              </FacilityProfileForm>
            ) : (
              <p className="text-xs text-warm-400">
                Add locations to this client first, then configure facility profiles.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-warm-200">
                  <TableHead className="text-warm-500 font-medium">Facility</TableHead>
                  <TableHead className="text-warm-500 font-medium">Category</TableHead>
                  <TableHead className="text-warm-500 font-medium">Status</TableHead>
                  <TableHead className="text-warm-500 font-medium text-right">Monthly Rate</TableHead>
                  <TableHead className="text-warm-500 font-medium">Frequency</TableHead>
                  <TableHead className="text-warm-500 font-medium">Days</TableHead>
                  <TableHead className="text-warm-500 font-medium">Seasonal</TableHead>
                  <TableHead className="text-warm-500 font-medium w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facilities.map((facility: any) => (
                  <TableRow
                    key={facility.id}
                    className="border-warm-200 hover:bg-warm-50"
                  >
                    <TableCell className="font-medium text-warm-900">
                      {facility.location?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {facility.category ? (
                        <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600 capitalize">
                          {facility.category}
                        </Badge>
                      ) : (
                        <span className="text-warm-400">-</span>
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
                            className="data-[state=checked]:bg-lime-500 data-[state=unchecked]:bg-warm-300"
                          />
                        ) : (
                          <FacilityStatusBadge status={facility.status} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-warm-900">
                      {formatRate(facility.defaultMonthlyRate)}
                    </TableCell>
                    <TableCell className="text-warm-700">
                      {facility.normalFrequencyPerWeek > 0
                        ? `${facility.normalFrequencyPerWeek}x/week`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-warm-700 text-sm">
                      {formatDays(facility.normalDaysOfWeek)}
                    </TableCell>
                    <TableCell>
                      {facility.seasonalRulesEnabled && facility.seasonalRules?.length > 0 ? (
                        <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200">
                          <Snowflake className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-warm-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-sm text-warm-500 hover:text-warm-700"
                            disabled={updating === facility.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-sm border-warm-200">
                          <FacilityProfileForm
                            clientId={clientId}
                            availableLocations={availableLocations}
                            facility={facility}
                          >
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Edit className="mr-2 h-4 w-4" />
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
                              <Snowflake className="mr-2 h-4 w-4 text-blue-600" />
                              Seasonal Rules
                            </DropdownMenuItem>
                          </SeasonalRuleForm>
                          <MonthlyOverrideForm
                            clientId={clientId}
                            facilityId={facility.id}
                            facilityName={facility.location?.name}
                          >
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Calendar className="mr-2 h-4 w-4 text-orange-600" />
                              Add Override
                            </DropdownMenuItem>
                          </MonthlyOverrideForm>
                          {facility.status !== 'CLOSED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleQuickStatusChange(facility.id, 'CLOSED')}
                              >
                                <X className="mr-2 h-4 w-4" />
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
