'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, Lock, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { EmptyState } from '@/components/ui/empty-state'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { LocationCard } from './location-card'
import { LocationRowActions } from './location-row-actions'
import { LocationQuickView } from './location-quick-view'
import { marginTone, reviewBadgeVariant } from './tones'
import { LocationForm } from '@/components/forms/location-form'
import { FinancialKPIRow } from '@/components/shared/financial-kpi-row'
import { formatMargin, type FinancialSummary, type FinancialsBandData } from '@/lib/financials'
import { formatMoney, moneyClass } from '@/lib/format'
import { formatServiceDays, normalizeServiceProfile } from '@/lib/operations/dispatch'
import { getReviewFreshness } from '@/lib/operations/review-freshness'
import { persistViewMode } from '@/lib/view-mode'
import { cn } from '@/lib/utils'

interface LocationsListClientProps {
  locations: LocationListItem[]
  showFinancials?: boolean
  initialViewMode: ViewMode
  bandData: FinancialsBandData | null
  locationsServiced: number
}

type AddressLike = {
  street?: string
  city?: string
  state?: string
  zip?: string
}

type NormalizableServiceProfile = Parameters<typeof normalizeServiceProfile>[0]

type LocationListItem = {
  id: string
  name: string
  logoUrl?: string | null
  isActive: boolean
  address?: unknown
  client: {
    id: string
    name: string
  }
  branch: {
    code: string
  }
  checklistTemplate?: {
    id: string
    name: string
  } | null
  serviceProfile?: NormalizableServiceProfile
  reviews?: Array<{
    id: string
    reviewDate?: Date | string | null
    createdAt?: Date | string | null
    photos?: string[] | null
  }>
  _count: {
    issues: number
  }
  financials?: FinancialSummary | null
}

function isAddressLike(value: unknown): value is AddressLike {
  return typeof value === 'object' && value !== null
}

function addressToString(address: unknown): string {
  if (typeof address === 'string') return address
  if (isAddressLike(address)) {
    return `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
  }
  return ''
}

export function LocationsListClient({
  locations,
  showFinancials = false,
  initialViewMode,
  bandData,
  locationsServiced,
}: LocationsListClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  // Quick-view slide-over: which location (by id) is open in the panel.
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    persistViewMode('locations-view-mode', mode)
  }

  // Distinct clients present in the list, for the client filter dropdown.
  const clientOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const l of locations) {
      if (!seen.has(l.client.id)) seen.set(l.client.id, l.client.name)
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [locations])

  const isFiltering = query.trim() !== '' || clientFilter !== 'all'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return locations.filter((l) => {
      if (clientFilter !== 'all' && l.client.id !== clientFilter) return false
      if (!q) return true
      return (
        l.name.toLowerCase().includes(q) ||
        addressToString(l.address).toLowerCase().includes(q)
      )
    })
  }, [locations, query, clientFilter])

  // Group locations under their client for the card view — locations arrive
  // pre-ordered by client name, so consecutive grouping preserves order.
  const groups = useMemo(() => {
    const map = new Map<string, { client: LocationListItem['client']; items: LocationListItem[] }>()
    for (const l of filtered) {
      const group = map.get(l.client.id)
      if (group) {
        group.items.push(l)
      } else {
        map.set(l.client.id, { client: l.client, items: [l] })
      }
    }
    return Array.from(map.values())
  }, [filtered])

  // Resolve the open quick-view against the current filtered list so
  // prev/next steps through exactly what's on screen.
  const selectedIndex = selectedId
    ? filtered.findIndex((l) => l.id === selectedId)
    : -1
  const selectedLocation = selectedIndex >= 0 ? filtered[selectedIndex] : null

  // No locations at all — first-run empty state.
  if (locations.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          kicker="CLIENTS · PORTFOLIO"
          title="Locations"
          subtitle="View all service locations across all clients"
        />
        <Card>
          <CardContent>
            <EmptyState
              icon={Building2}
              title="No locations yet — add your first stop"
              description="Create a location and link it to a client to start scheduling service, checklists, and reviews."
              action={
                <LocationForm>
                  <Button variant="outline">
                    <Plus className="size-4" />
                    Add Location
                  </Button>
                </LocationForm>
              }
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="CLIENTS · PORTFOLIO"
        title="Locations"
        subtitle="View all service locations across all clients"
        actions={
          <>
            <ViewToggle value={viewMode} onChange={handleViewChange} />
            <LocationForm>
              <Button variant="gold">
                <Plus className="size-4" />
                Add Location
              </Button>
            </LocationForm>
          </>
        }
      />

      {showFinancials && bandData ? (
        <div className="space-y-1.5">
          <FinancialKPIRow
            locationsServiced={bandData.locationsServiced}
            mrr={bandData.mrr}
            arr={bandData.arr}
            monthlyProfit={bandData.monthlyProfit}
            blendedMarginPct={bandData.blendedMarginPct}
          />
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="size-3 shrink-0" />
            Gross P&amp;L from service agreements · All locations. Overhead-inclusive net lives on
            the Financials dashboard.
          </p>
        </div>
      ) : (
        // Non-admins: a single honest count, no money.
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Locations serviced" value={locationsServiced} icon={Building2} />
        </div>
      )}

      {/* Search + client filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations by name or address…"
            className="pl-8"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clientOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Locations</CardTitle>
              <CardDescription>
                {filtered.length}
                {isFiltering ? ` of ${locations.length}` : ''}{' '}
                {locations.length === 1 ? 'location' : 'locations'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No locations match"
              description="Try a different name or address, or clear the client filter."
            />
          ) : viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Location</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Dispatch</TableHead>
                  <TableHead>Review Status</TableHead>
                  <TableHead>Issues</TableHead>
                  {showFinancials && (
                    <>
                      <TableHead className="text-right">MRR</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((location) => {
                  const serviceProfile = normalizeServiceProfile(location.serviceProfile)
                  const reviewFreshness = getReviewFreshness(location.reviews?.[0])
                  const addressStr = addressToString(location.address)
                  return (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {location.logoUrl ? (
                            <div className="relative size-9 shrink-0 overflow-hidden rounded-[9px] bg-secondary">
                              <Image
                                src={location.logoUrl}
                                alt={location.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-secondary">
                              <Building2 className="size-4 text-muted-foreground" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedId(location.id)}
                            className="text-left font-medium text-foreground transition-colors hover:text-primary"
                          >
                            {location.name}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/clients/${location.client.id}`}
                          className="text-muted-foreground transition-colors hover:text-primary"
                        >
                          {location.client.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{location.branch.code}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {addressStr || '—'}
                      </TableCell>
                      <TableCell>
                        {location.checklistTemplate ? (
                          <Badge variant="neutral">{location.checklistTemplate.name}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="neutral">
                            {serviceProfile.autoSchedule ? 'Auto Route' : 'Manual'}
                          </Badge>
                          <p className="font-mono text-xs text-muted-foreground">
                            {formatServiceDays(serviceProfile.serviceDays)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={reviewBadgeVariant(reviewFreshness)}>
                            {reviewFreshness.shortLabel}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {reviewFreshness.reviewedOnLabel || 'Needs manager review photos'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'font-mono tabular-nums',
                            location._count.issues > 0
                              ? 'font-medium text-coral-600 dark:text-coral-300'
                              : 'text-muted-foreground'
                          )}
                        >
                          {location._count.issues}
                        </span>
                      </TableCell>
                      {showFinancials && (
                        <>
                          <TableCell className={cn('text-right text-foreground', moneyClass)}>
                            {location.financials ? formatMoney(location.financials.monthlyRevenue) : '—'}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right',
                              moneyClass,
                              location.financials ? marginTone(location.financials.marginPct) : 'text-muted-foreground'
                            )}
                          >
                            {location.financials ? formatMoney(location.financials.monthlyProfit) : '—'}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right',
                              moneyClass,
                              location.financials ? marginTone(location.financials.marginPct) : 'text-muted-foreground'
                            )}
                          >
                            {location.financials ? formatMargin(location.financials.marginPct) : '—'}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedId(location.id)}>
                            View
                          </Button>
                          <LocationRowActions
                            locationId={location.id}
                            entityLabel={`${location.client.name} - ${location.name}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.client.id} className="space-y-2.5">
                  <div className="flex items-baseline gap-2 border-b border-border pb-1.5">
                    <Link
                      href={`/clients/${group.client.id}`}
                      className="font-display text-sm font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      {group.client.name}
                    </Link>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {group.items.length} {group.items.length === 1 ? 'location' : 'locations'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.items.map((location) => (
                      <LocationCard
                        key={location.id}
                        location={location}
                        showFinancials={showFinancials}
                        onView={(l) => setSelectedId(l.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedIndex >= 0 && selectedLocation && (
        <LocationQuickView
          key={selectedLocation.id}
          location={selectedLocation}
          showFinancials={showFinancials}
          position={selectedIndex + 1}
          total={filtered.length}
          onClose={() => setSelectedId(null)}
          onPrev={
            selectedIndex > 0
              ? () => setSelectedId(filtered[selectedIndex - 1].id)
              : undefined
          }
          onNext={
            selectedIndex < filtered.length - 1
              ? () => setSelectedId(filtered[selectedIndex + 1].id)
              : undefined
          }
        />
      )}
    </div>
  )
}
