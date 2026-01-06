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
            <h1 className="text-3xl font-bold">Locations</h1>
            <p className="text-muted-foreground">
              View all service locations across all clients
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-2">No locations yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first location and link it to a client
            </p>
            <LocationForm>
              <Button>
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
          <h1 className="text-3xl font-bold">Locations</h1>
          <p className="text-muted-foreground">
            View all service locations across all clients
          </p>
        </div>
        <ViewToggle value={viewMode} onChange={handleViewChange} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Locations</CardTitle>
              <CardDescription>
                {locations.length}{' '}
                {locations.length === 1 ? 'location' : 'locations'}
              </CardDescription>
            </div>
            <LocationForm>
              <Button size="sm">
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
                <TableRow>
                  <TableHead className="w-16">Logo</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location: any) => {
                  const address = location.address as any
                  const addressStr = address
                    ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
                    : '-'
                  return (
                    <TableRow key={location.id}>
                      <TableCell>
                        {location.logoUrl ? (
                          <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                            <Image
                              src={location.logoUrl}
                              alt={location.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/locations/${location.id}`}
                          className="hover:underline"
                        >
                          {location.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/clients/${location.client.id}`}
                          className="hover:underline text-muted-foreground"
                        >
                          {location.client.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{location.branch.code}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {addressStr}
                      </TableCell>
                      <TableCell>
                        {location.checklistTemplate ? (
                          <Badge variant="outline" className="text-xs">
                            {location.checklistTemplate.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            location._count.issues > 0 ? 'destructive' : 'secondary'
                          }
                        >
                          {location._count.issues}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/locations/${location.id}`}>
                          <Button variant="ghost" size="sm">
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

