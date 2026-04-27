'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { LocationCard } from './location-card'
import { LocationForm } from '@/components/forms/location-form'
import { formatServiceDays, normalizeServiceProfile } from '@/lib/operations/dispatch'
import { getReviewFreshness } from '@/lib/operations/review-freshness'

interface LocationsListClientProps {
  locations: LocationListItem[]
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
}

export function LocationsListClient({ locations }: LocationsListClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') {
      return 'table'
    }

    const saved = localStorage.getItem('locations-view-mode')
    return saved === 'card' ? 'card' : 'table'
  })

  // Save view preference to localStorage
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('locations-view-mode', mode)
  }

  if (locations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">Locations</h1>
            <p className="text-sm text-warm-500 dark:text-cream-400">
              View all service locations across all clients
            </p>
          </div>
        </div>
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 mb-4 text-warm-400 dark:text-cream-400" />
            <p className="text-warm-600 dark:text-cream-400 mb-2">No locations yet</p>
            <p className="text-sm text-warm-500 dark:text-cream-400 mb-4">
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
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">Locations</h1>
          <p className="text-sm text-warm-500 dark:text-cream-400">
            View all service locations across all clients
          </p>
        </div>
        <ViewToggle value={viewMode} onChange={handleViewChange} />
      </div>

      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">All Locations</CardTitle>
              <CardDescription className="text-warm-500 dark:text-cream-400">
                {locations.length}{' '}
                {locations.length === 1 ? 'location' : 'locations'}
              </CardDescription>
            </div>
            <LocationForm>
              <Button variant="lime" size="sm" className="rounded-sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </LocationForm>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
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
                  <TableHead className="text-right text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => {
                  const address = location.address
                  const serviceProfile = normalizeServiceProfile(location.serviceProfile)
                  const reviewFreshness = getReviewFreshness(location.reviews?.[0])
                  const addressStr =
                    typeof address === 'string'
                      ? address
                      : isAddressLike(address)
                        ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
                        : '-'
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
                      <TableCell className="text-right">
                        <Link href={`/locations/${location.id}`}>
                          <Button variant="ghost" size="sm" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  clientId={location.client.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function isAddressLike(value: unknown): value is AddressLike {
  return typeof value === 'object' && value !== null
}

