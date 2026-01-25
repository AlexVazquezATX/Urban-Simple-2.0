'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardCheck,
  MapPin,
  Clock,
  Building2,
  Phone,
  Navigation,
  Loader2,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TonightLocation {
  id: string
  locationId: string
  locationName: string
  clientName: string
  address: string
  scheduledTime: string
  checklistName: string
  status: 'pending' | 'in_progress' | 'completed'
  reviewId?: string
}

export default function NightlyReviewsPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<TonightLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  useEffect(() => {
    fetchTonightLocations()
  }, [])

  const fetchTonightLocations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/operations/tonight-route', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations)
      } else {
        throw new Error("Failed to fetch tonight's locations")
      }
    } catch (error: any) {
      console.error('Fetch error:', error)
      toast.error(error.message || "Failed to load tonight's route")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLocations = locations.filter((loc) => {
    if (filter === 'all') return true
    if (filter === 'pending') return loc.status !== 'completed'
    return loc.status === 'completed'
  })

  const completedCount = locations.filter((l) => l.status === 'completed').length
  const pendingCount = locations.length - completedCount

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-lime-600" />
      case 'in_progress':
        return <AlertCircle className="h-5 w-5 text-orange-600" />
      default:
        return <Circle className="h-5 w-5 text-warm-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-lime-100 text-lime-700 border-lime-200">Completed</Badge>
      case 'in_progress':
        return <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200">In Progress</Badge>
      default:
        return <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">Pending</Badge>
    }
  }

  const handleStartReview = (location: TonightLocation) => {
    router.push(`/operations/nightly-reviews/${location.id}`)
  }

  const handleGetDirections = (address: string) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    window.open(mapsUrl, '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-warm-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">Tonight's Route</h1>
        <p className="text-sm text-warm-500 mt-1">
          Review locations scheduled for tonight's service
        </p>
      </div>

      {/* Progress Summary */}
      <Card className="rounded-sm border-ocean-200 bg-gradient-to-br from-ocean-50 to-ocean-100/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-warm-500">Progress</p>
              <p className="text-2xl font-bold text-warm-900 mt-1">
                {completedCount} / {locations.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-warm-500">Pending</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">{pendingCount}</p>
            </div>
            <div className="hidden sm:block w-32">
              <div className="w-full bg-warm-200 rounded-sm h-2">
                <div
                  className="bg-ocean-600 h-2 rounded-sm transition-all duration-300"
                  style={{ width: `${(completedCount / locations.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'lime' : 'outline'}
          onClick={() => setFilter('all')}
          className="flex-1 sm:flex-none rounded-sm"
        >
          All ({locations.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'lime' : 'outline'}
          onClick={() => setFilter('pending')}
          className="flex-1 sm:flex-none rounded-sm"
        >
          Pending ({pendingCount})
        </Button>
        <Button
          variant={filter === 'completed' ? 'lime' : 'outline'}
          onClick={() => setFilter('completed')}
          className="flex-1 sm:flex-none rounded-sm"
        >
          Completed ({completedCount})
        </Button>
      </div>

      {/* Location Cards */}
      <div className="space-y-3">
        {filteredLocations.length === 0 ? (
          <Card className="rounded-sm border-warm-200">
            <CardContent className="py-12 text-center text-warm-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-warm-300" />
              <p>No locations found for this filter</p>
            </CardContent>
          </Card>
        ) : (
          filteredLocations.map((location) => (
            <Card
              key={location.id}
              className={cn(
                'rounded-sm border-warm-200 hover:border-ocean-400 transition-colors',
                location.status === 'completed' && 'bg-lime-50/50 border-lime-200'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(location.status)}
                  </div>

                  {/* Location Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-warm-900">{location.locationName}</h3>
                        <p className="text-xs text-warm-500">{location.clientName}</p>
                      </div>
                      {getStatusBadge(location.status)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-warm-500">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate text-xs">{location.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-warm-500">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs">{location.scheduledTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-warm-500 sm:col-span-2">
                        <ClipboardCheck className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs">{location.checklistName}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        onClick={() => handleStartReview(location)}
                        variant="lime"
                        className="flex-1 sm:flex-none rounded-sm"
                        disabled={location.status === 'completed'}
                      >
                        {location.status === 'completed' ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            View Review
                          </>
                        ) : (
                          <>
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            {location.status === 'in_progress' ? 'Continue Review' : 'Start Review'}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleGetDirections(location.address)}
                        className="flex-1 sm:flex-none rounded-sm"
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Directions
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
