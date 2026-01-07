'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  Star,
  Camera,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  MapPin,
  Clock,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ChecklistItem {
  id: string
  name: string
  status: 'good' | 'needs_work' | 'not_done' | 'pending'
  notes?: string
  photos?: string[]
}

interface PainPoint {
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  photos: string[]
}

export default function LocationReviewPage() {
  const router = useRouter()
  const params = useParams()
  const reviewId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [locationData, setLocationData] = useState<any>(null)
  const [overallRating, setOverallRating] = useState(0)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [painPoints, setPainPoints] = useState<PainPoint[]>([])
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    fetchReviewData()
  }, [reviewId])

  const fetchReviewData = async () => {
    try {
      setIsLoading(true)
      // TODO: Fetch location and checklist data
      // For now, mock data
      setLocationData({
        locationName: 'Hotel Grand Austin',
        clientName: 'Hospitality Partners LLC',
        address: '123 Congress Ave, Austin, TX 78701',
        scheduledTime: '10:00 PM',
        associateName: 'Maria Garcia',
        checklistName: 'Hotel Standard Cleaning',
      })

      // Mock checklist items
      setChecklistItems([
        { id: '1', name: 'Lobby cleaned and vacuumed', status: 'pending' },
        { id: '2', name: 'Guest rooms restocked', status: 'pending' },
        { id: '3', name: 'Bathrooms sanitized', status: 'pending' },
        { id: '4', name: 'Windows and mirrors cleaned', status: 'pending' },
        { id: '5', name: 'Trash removed and replaced', status: 'pending' },
      ])

      setIsLoading(false)
    } catch (error: any) {
      console.error('Fetch error:', error)
      toast.error('Failed to load review data')
      setIsLoading(false)
    }
  }

  const handleChecklistItemStatus = (itemId: string, status: ChecklistItem['status']) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status } : item))
    )
  }

  const handleAddPainPoint = (category: string) => {
    setPainPoints((prev) => [
      ...prev,
      {
        category,
        severity: 'medium',
        description: '',
        photos: [],
      },
    ])
  }

  const handleSubmitReview = async () => {
    // Validation
    if (overallRating === 0) {
      toast.error('Please provide an overall rating')
      return
    }

    const incompleteItems = checklistItems.filter((item) => item.status === 'pending')
    if (incompleteItems.length > 0) {
      toast.error('Please review all checklist items')
      return
    }

    // Validate pain points have descriptions
    const incompletePainPoints = painPoints.filter((p) => !p.description.trim())
    if (incompletePainPoints.length > 0) {
      toast.error('Please add descriptions to all pain points')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/operations/service-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reviewId,
          overallRating,
          checklistItems,
          painPoints,
          notes,
          photos,
        }),
      })

      if (response.ok) {
        toast.success('Review submitted successfully!')
        router.push('/operations/nightly-reviews')
      } else {
        throw new Error('Failed to submit review')
      }
    } catch (error: any) {
      console.error('Submit error:', error)
      toast.error(error.message || 'Failed to submit review')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-ocean-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{locationData.locationName}</h1>
          <p className="text-sm text-muted-foreground">{locationData.clientName}</p>
        </div>
      </div>

      {/* Location Info */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{locationData.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Scheduled: {locationData.scheduledTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Associate: {locationData.associateName}</span>
          </div>
        </CardContent>
      </Card>

      {/* Overall Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Quality Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 justify-center py-4">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setOverallRating(rating)}
                className="focus:outline-none touch-manipulation"
              >
                <Star
                  className={cn(
                    'h-12 w-12 transition-colors',
                    rating <= overallRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  )}
                />
              </button>
            ))}
          </div>
          {overallRating > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {overallRating === 5 && 'Excellent work!'}
              {overallRating === 4 && 'Good job'}
              {overallRating === 3 && 'Acceptable'}
              {overallRating === 2 && 'Needs improvement'}
              {overallRating === 1 && 'Unsatisfactory'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Checklist Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Checklist Verification</CardTitle>
          <p className="text-sm text-muted-foreground">{locationData.checklistName}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklistItems.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <p className="font-medium">{item.name}</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={item.status === 'good' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleChecklistItemStatus(item.id, 'good')}
                  className={cn(
                    item.status === 'good' && 'bg-green-600 hover:bg-green-700'
                  )}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Good
                </Button>
                <Button
                  variant={item.status === 'needs_work' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleChecklistItemStatus(item.id, 'needs_work')}
                  className={cn(
                    item.status === 'needs_work' && 'bg-orange-600 hover:bg-orange-700'
                  )}
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Needs Work
                </Button>
                <Button
                  variant={item.status === 'not_done' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleChecklistItemStatus(item.id, 'not_done')}
                  className={cn(
                    item.status === 'not_done' && 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Not Done
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pain Points */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Pain Points & Issues
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Critical - Report any issues found during inspection
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {painPoints.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No issues reported - Tap a category below to add
            </p>
          )}

          {/* Display added pain points */}
          {painPoints.map((point, index) => (
            <div key={index} className="border-2 border-red-200 rounded-lg p-4 space-y-3 bg-red-50">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">
                  {point.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPainPoints(prev => prev.filter((_, i) => i !== index))}
                  className="h-8 w-8 p-0 hover:bg-red-200"
                >
                  <XCircle className="h-4 w-4 text-red-600" />
                </Button>
              </div>

              {/* Severity selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Severity</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
                    <Button
                      key={severity}
                      variant={point.severity === severity ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const updated = [...painPoints]
                        updated[index].severity = severity
                        setPainPoints(updated)
                      }}
                      className={cn(
                        'text-xs',
                        point.severity === severity && severity === 'low' && 'bg-yellow-500 hover:bg-yellow-600',
                        point.severity === severity && severity === 'medium' && 'bg-orange-500 hover:bg-orange-600',
                        point.severity === severity && severity === 'high' && 'bg-red-500 hover:bg-red-600',
                        point.severity === severity && severity === 'critical' && 'bg-red-700 hover:bg-red-800'
                      )}
                    >
                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Description *</Label>
                <Textarea
                  value={point.description}
                  onChange={(e) => {
                    const updated = [...painPoints]
                    updated[index].description = e.target.value
                    setPainPoints(updated)
                  }}
                  placeholder="Describe the issue in detail..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Photo upload placeholder */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Photos (Optional)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={() => toast.info('Photo upload coming soon')}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Add Photos
                </Button>
                {point.photos.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {point.photos.length} photo(s) attached
                  </p>
                )}
              </div>
            </div>
          ))}

          <Separator className="my-4" />

          <p className="text-xs font-semibold text-muted-foreground mb-2">Add Pain Point:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddPainPoint('supply_shortage')}
              className="border-orange-300"
            >
              ⚠️ Supply Shortage
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddPainPoint('equipment')}
              className="border-orange-300"
            >
              🔧 Equipment Issue
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddPainPoint('staffing')}
              className="border-orange-300"
            >
              👤 Staffing Concern
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddPainPoint('quality')}
              className="border-orange-300"
            >
              🧼 Quality Issue
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddPainPoint('safety')}
              className="border-red-300"
            >
              🚨 Safety Hazard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddPainPoint('client_feedback')}
              className="border-orange-300"
            >
              💬 Client Feedback
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional observations, comments, or feedback..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Submit Button - Fixed at bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t md:relative md:border-0">
        <Button
          onClick={handleSubmitReview}
          disabled={isSaving}
          className="w-full h-14 text-lg bg-ocean-600 hover:bg-ocean-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Submit Review
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
