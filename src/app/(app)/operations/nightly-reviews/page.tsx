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
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <AlertCircle className="h-5 w-5 text-orange-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Completed</Badge>
      case 'in_progress':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-300">In Progress</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
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
        <Loader2 className="h-8 w-8 animate-spin text-ocean-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tonight's Route</h1>
        <p className="text-muted-foreground mt-1">
          Review locations scheduled for tonight's service
        </p>
      </div>

      {/* Progress Summary */}
      <Card className="border-ocean-200 bg-gradient-to-br from-ocean-50 to-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold mt-1">
                {completedCount} / {locations.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">{pendingCount}</p>
            </div>
            <div className="hidden sm:block w-32">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-ocean-600 h-3 rounded-full transition-all duration-300"
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
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className="flex-1 sm:flex-none"
        >
          All ({locations.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          className="flex-1 sm:flex-none"
        >
          Pending ({pendingCount})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
          className="flex-1 sm:flex-none"
        >
          Completed ({completedCount})
        </Button>
      </div>

      {/* Location Cards */}
      <div className="space-y-4">
        {filteredLocations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No locations found for this filter</p>
            </CardContent>
          </Card>
        ) : (
          filteredLocations.map((location) => (
            <Card
              key={location.id}
              className={cn(
                'hover:shadow-md transition-shadow',
                location.status === 'completed' && 'bg-green-50/50 border-green-200'
              )}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(location.status)}
                  </div>

                  {/* Location Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{location.locationName}</h3>
                        <p className="text-sm text-muted-foreground">{location.clientName}</p>
                      </div>
                      {getStatusBadge(location.status)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{location.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>{location.scheduledTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                        <ClipboardCheck className="h-4 w-4 flex-shrink-0" />
                        <span>{location.checklistName}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        onClick={() => handleStartReview(location)}
                        className="flex-1 sm:flex-none bg-ocean-600 hover:bg-ocean-700"
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
                        className="flex-1 sm:flex-none"
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
