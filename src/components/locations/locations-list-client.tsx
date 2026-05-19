'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, Plus, Search } from 'lucide-react'
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
import { LocationCard } from './location-card'
import { LocationForm } from '@/components/forms/location-form'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { FinancialsSummaryBand } from '@/components/financials/financials-summary-band'
import { formatCurrency, formatMargin, marginToneClass, type FinancialSummary, type FinancialsBandData } from '@/lib/financials'
import { formatServiceDays, normalizeServiceProfile } from '@/lib/operations/dispatch'
import { getReviewFreshness } from '@/lib/operations/review-freshness'
import { persistViewMode } from '@/lib/view-mode'

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

  // No locations at all — first-run empty state.
  if (locations.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">
            Locations
          </h1>
          <p className="text-sm text-warm-500 dark:text-cream-400">
            View all service locations across all clients
          </p>
        </div>
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="mb-4 h-12 w-12 text-warm-400 dark:text-cream-400" />
            <p className="mb-2 text-warm-600 dark:text-cream-400">No locations yet</p>
            <p className="mb-4 text-sm text-warm-500 dark:text-cream-400">
              Create your first location and link it to a client
            </p>
            <LocationForm>
              <Button variant="lime" className="rounded-sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </LocationForm>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">
            Locations
          </h1>
          <p className="text-sm text-warm-500 dark:text-cream-400">
            View all service locations across all clients
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle value={viewMode} onChange={handleViewChange} />
          <LocationForm>
            <Button variant="lime" className="rounded-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </LocationForm>
        </div>
      </div>

      <FinancialsSummaryBand
        variant={showFinancials ? 'admin' : 'plain'}
        locationsServiced={locationsServiced}
        data={bandData}
        scopeLabel="All locations"
      />

      {/* Search + client filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400 dark:text-cream-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations by name or address…"
            className="rounded-sm pl-8"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full rounded-sm sm:w-60">
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

      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
                All Locations
              </CardTitle>
              <CardDescription className="text-warm-500 dark:text-cream-400">
                {filtered.length}
                {isFiltering ? ` of ${locations.length}` : ''}{' '}
                {locations.length === 1 ? 'location' : 'locations'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-warm-500 dark:text-cream-400">
              No locations match your search.
            </div>
          ) : viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow className="border-warm-200 dark:border-charcoal-700 hover:bg-transparent">
                  <TableHead className="w-16 text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Logo</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Branch</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Address</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Checklist</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Dispatch</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Review Status</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Issues</TableHead>
                  {showFinancials && (
                    <>
                      <TableHead className="text-right text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">MRR</TableHead>
                      <TableHead className="text-right text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Profit</TableHead>
                      <TableHead className="text-right text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Margin</TableHead>
                    </>
                  )}
                  <TableHead className="text-right text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((location) => {
                  const serviceProfile = normalizeServiceProfile(location.serviceProfile)
                  const reviewFreshness = getReviewFreshness(location.reviews?.[0])
                  const addressStr = addressToString(location.address) || '-'
                  return (
                    <TableRow key={location.id} className="border-warm-200 dark:border-charcoal-700 hover:bg-warm-50">
                      <TableCell>
                        {location.logoUrl ? (
                          <div className="relative h-10 w-10 rounded-sm overflow-hidden bg-warm-100">
                            <Image
                              src={location.logoUrl}
                              alt={location.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-sm bg-warm-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-warm-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-warm-900 dark:text-cream-100">
                        <Link
                          href={`/locations/${location.id}`}
                          className="hover:text-ocean-600 transition-colors"
                        >
                          {location.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/clients/${location.client.id}`}
                          className="hover:text-ocean-600 text-warm-600 dark:text-cream-400 transition-colors"
                        >
                          {location.client.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">{location.branch.code}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-warm-500 dark:text-cream-400 max-w-xs truncate">
                        {addressStr}
                      </TableCell>
                      <TableCell>
                        {location.checklistTemplate ? (
                          <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">
                            {location.checklistTemplate.name}
                          </Badge>
                        ) : (
                          <span className="text-warm-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600"
                          >
                            {serviceProfile.autoSchedule ? 'Auto Route' : 'Manual'}
                          </Badge>
                          <p className="text-xs text-warm-500 dark:text-cream-400">
                            {formatServiceDays(serviceProfile.serviceDays)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            className={`rounded-sm text-[10px] px-1.5 py-0 ${
                              reviewFreshness.isStale
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-lime-100 text-lime-700 border-lime-200'
                            }`}
                          >
                            {reviewFreshness.shortLabel}
                          </Badge>
                          <p className="text-xs text-warm-500 dark:text-cream-400">
                            {reviewFreshness.reviewedOnLabel || 'Needs manager review photos'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-sm text-[10px] px-1.5 py-0 ${
                            location._count.issues > 0
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-warm-100 text-warm-600 border-warm-200'
                          }`}
                        >
                          {location._count.issues}
                        </Badge>
                      </TableCell>
                      {showFinancials && (
                        <>
                          <TableCell className="text-right font-mono text-warm-700 dark:text-cream-300">
                            {location.financials ? formatCurrency(location.financials.monthlyRevenue) : '—'}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${location.financials ? marginToneClass(location.financials.marginPct) : ''}`}>
                            {location.financials ? formatCurrency(location.financials.monthlyProfit) : '—'}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${location.financials ? marginToneClass(location.financials.marginPct) : ''}`}>
                            {location.financials ? formatMargin(location.financials.marginPct) : '—'}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/locations/${location.id}`}>
                            <Button variant="ghost" size="sm" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
                              View
                            </Button>
                          </Link>
                          <ConfirmDeleteButton
                            endpoint={`/api/locations/${location.id}`}
                            entityLabel={`${location.client.name} - ${location.name}`}
                            entityKind="location"
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
                  <div className="flex items-center gap-2 border-b border-warm-200 pb-1.5 dark:border-charcoal-700">
                    <Link
                      href={`/clients/${group.client.id}`}
                      className="text-sm font-medium text-warm-700 transition-colors hover:text-ocean-600 dark:text-cream-200"
                    >
                      {group.client.name}
                    </Link>
                    <span className="text-xs text-warm-400 dark:text-cream-500">
                      {group.items.length} {group.items.length === 1 ? 'location' : 'locations'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.items.map((location) => (
                      <LocationCard
                        key={location.id}
                        location={location}
                        showFinancials={showFinancials}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
