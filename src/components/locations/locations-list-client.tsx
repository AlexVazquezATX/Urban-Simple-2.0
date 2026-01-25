'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Building2, Plus } from 'lucide-react'
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

interface LocationsListClientProps {
  locations: any[]
}

export function LocationsListClient({ locations }: LocationsListClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Load view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('locations-view-mode') as ViewMode
    if (saved && (saved === 'table' || saved === 'card')) {
      setViewMode(saved)
    }
  }, [])

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
            <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">Locations</h1>
            <p className="text-sm text-warm-500">
              View all service locations across all clients
            </p>
          </div>
        </div>
        <Card className="rounded-sm border-warm-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 mb-4 text-warm-400" />
            <p className="text-warm-600 mb-2">No locations yet</p>
            <p className="text-sm text-warm-500 mb-4">
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
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">Locations</h1>
          <p className="text-sm text-warm-500">
            View all service locations across all clients
          </p>
        </div>
        <ViewToggle value={viewMode} onChange={handleViewChange} />
      </div>

      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display font-medium text-warm-900">All Locations</CardTitle>
              <CardDescription className="text-warm-500">
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
                <TableRow className="border-warm-200 hover:bg-transparent">
                  <TableHead className="w-16 text-xs font-medium text-warm-500 uppercase tracking-wider">Logo</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Branch</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Address</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Checklist</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Issues</TableHead>
                  <TableHead className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location: any) => {
                  const address = location.address as any
                  const addressStr = address
                    ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
                    : '-'
                  return (
                    <TableRow key={location.id} className="border-warm-200 hover:bg-warm-50">
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
                      <TableCell className="font-medium text-warm-900">
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
                          className="hover:text-ocean-600 text-warm-600 transition-colors"
                        >
                          {location.client.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">{location.branch.code}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-warm-500 max-w-xs truncate">
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

