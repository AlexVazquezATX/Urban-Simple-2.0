'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle,
  Clock,
  ImagePlus,
  Loader2,
  MapPin,
  Star,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type {
  NightlyReviewChecklistItemState,
  NightlyReviewPainPoint,
  NightlyReviewPainPointSeverity,
} from '@/lib/operations/nightly-reviews'

interface NightlyReviewFormProps {
  reviewTargetId: string
  shiftId: string
  locationId: string
  locationName: string
  clientName: string
  address: string
  scheduledTime: string
  serviceDateLabel: string
  associateName: string
  checklistName: string
  checklistItems: NightlyReviewChecklistItemState[]
  initialRating: number
  initialNotes: string
  initialPainPoints: NightlyReviewPainPoint[]
  initialPhotos: string[]
  readOnly?: boolean
  submittedAt?: string | null
}

export function NightlyReviewForm({
  reviewTargetId,
  shiftId,
  locationId,
  locationName,
  clientName,
  address,
  scheduledTime,
  serviceDateLabel,
  associateName,
  checklistName,
  checklistItems: initialChecklistItems,
  initialRating,
  initialNotes,
  initialPainPoints,
  initialPhotos,
  readOnly = false,
  submittedAt,
}: NightlyReviewFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [overallRating, setOverallRating] = useState(initialRating)
  const [checklistItems, setChecklistItems] = useState(initialChecklistItems)
  const [painPoints, setPainPoints] = useState(initialPainPoints)
  const [notes, setNotes] = useState(initialNotes)
  const [reviewPhotos, setReviewPhotos] = useState(initialPhotos)
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null)

  const groupedChecklist = useMemo(() => {
    const sections = new Map<
      string,
      {
        id: string
        name: string
        items: NightlyReviewChecklistItemState[]
      }
    >()

    checklistItems.forEach((item, index) => {
      const key = item.sectionId || item.sectionName || `general-${index}`
      const section = sections.get(key) ?? {
        id: key,
        name: item.sectionName || 'General',
        items: [],
      }
      section.items.push(item)
      sections.set(key, section)
    })

    return Array.from(sections.values())
  }, [checklistItems])

  const handleChecklistStatus = (
    itemId: string,
    status: NightlyReviewChecklistItemState['status']
  ) => {
    if (readOnly) return

    setChecklistItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, status } : item))
    )
  }

  const handleChecklistNotes = (itemId: string, value: string) => {
    if (readOnly) return

    setChecklistItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, notes: value } : item))
    )
  }

  const handleChecklistPhotos = (itemId: string, photos: string[]) => {
    if (readOnly) return

    setChecklistItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, photos } : item))
    )
  }

  const handleAddPainPoint = (category: string) => {
    if (readOnly) return

    setPainPoints((current) => [
      ...current,
      {
        category,
        severity: 'medium',
        description: '',
        photos: [],
      },
    ])
  }

  const handlePainPointChange = (
    index: number,
    updates: Partial<NightlyReviewPainPoint>
  ) => {
    if (readOnly) return

    setPainPoints((current) =>
      current.map((point, pointIndex) =>
        pointIndex === index ? { ...point, ...updates } : point
      )
    )
  }

  const uploadFiles = async (files: FileList | File[], targetKey: string) => {
    const fileList = Array.from(files)
    if (fileList.length === 0) {
      return []
    }

    setUploadingTarget(targetKey)
    try {
      const uploads = await Promise.all(
        fileList.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('folder', 'reviews')

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          const payload = await response.json().catch(() => ({}))
          if (!response.ok) {
            throw new Error(payload.error || 'Failed to upload photo')
          }

          return payload.url as string
        })
      )

      return uploads
    } finally {
      setUploadingTarget(null)
    }
  }

  const handleReviewPhotoUpload = async (files: FileList | null) => {
    if (!files || readOnly) return

    try {
      const uploaded = await uploadFiles(files, 'review-photos')
      setReviewPhotos((current) => Array.from(new Set([...current, ...uploaded])))
      toast.success('Review photo uploaded')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload review photo')
    }
  }

  const handleChecklistPhotoUpload = async (itemId: string, files: FileList | null) => {
    if (!files || readOnly) return

    try {
      const uploaded = await uploadFiles(files, `checklist-${itemId}`)
      const item = checklistItems.find((entry) => entry.id === itemId)
      handleChecklistPhotos(
        itemId,
        Array.from(new Set([...(item?.photos || []), ...uploaded]))
      )
      toast.success('Checklist photo uploaded')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload checklist photo')
    }
  }

  const handlePainPointPhotoUpload = async (index: number, files: FileList | null) => {
    if (!files || readOnly) return

    try {
      const uploaded = await uploadFiles(files, `pain-point-${index}`)
      const painPoint = painPoints[index]
      handlePainPointChange(index, {
        photos: Array.from(new Set([...(painPoint?.photos || []), ...uploaded])),
      })
      toast.success('Issue photo uploaded')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload issue photo')
    }
  }

  const handleRemovePainPoint = (index: number) => {
    if (readOnly) return

    setPainPoints((current) => current.filter((_, pointIndex) => pointIndex !== index))
  }

  const handleSubmitReview = async () => {
    if (readOnly) return

    if (overallRating === 0) {
      toast.error('Please provide an overall rating')
      return
    }

    const pendingItems = checklistItems.filter((item) => item.status === 'pending')
    if (pendingItems.length > 0) {
      toast.error('Please review every checklist item before submitting')
      return
    }

    const incompletePainPoints = painPoints.filter((point) => !point.description.trim())
    if (incompletePainPoints.length > 0) {
      toast.error('Please add a description for each reported issue')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/operations/service-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reviewId: reviewTargetId,
          shiftId,
          locationId,
          overallRating,
          checklistItems,
          painPoints,
          notes,
          photos: reviewPhotos,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to submit review')
      }

      toast.success('Nightly review submitted')
      router.push('/operations/nightly-reviews')
      router.refresh()
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit review'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-sm shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-display font-medium text-warm-900 dark:text-cream-100">
              {locationName}
            </h1>
            {readOnly && (
              <Badge className="rounded-sm bg-lime-100 text-lime-700 border-lime-200">
                Submitted
              </Badge>
            )}
          </div>
          <p className="text-sm text-warm-500 dark:text-cream-400">{clientName}</p>
          {submittedLabel && (
            <p className="text-xs text-warm-500 dark:text-cream-400 mt-1">
              Submitted {submittedLabel}
            </p>
          )}
        </div>
      </div>

      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-warm-400 mt-0.5 shrink-0" />
            <span className="text-warm-700 dark:text-cream-300">{address}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 text-warm-400 mt-0.5 shrink-0" />
            <span className="text-warm-700 dark:text-cream-300">
              {serviceDateLabel} at {scheduledTime}
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <User className="h-4 w-4 text-warm-400 mt-0.5 shrink-0" />
            <span className="text-warm-700 dark:text-cream-300">
              Associate: {associateName}
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-warm-400 mt-0.5 shrink-0" />
            <span className="text-warm-700 dark:text-cream-300">
              Checklist: {checklistName}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100">
            Overall Quality Rating
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex gap-2 justify-center py-4">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => !readOnly && setOverallRating(rating)}
                disabled={readOnly}
                className="focus:outline-none touch-manipulation disabled:cursor-default"
              >
                <Star
                  className={cn(
                    'h-10 w-10 transition-colors',
                    rating <= overallRating ? 'fill-lime-400 text-lime-400' : 'text-warm-300'
                  )}
                />
              </button>
            ))}
          </div>
          {overallRating > 0 && (
            <p className="text-center text-xs text-warm-500 dark:text-cream-400">
              {overallRating === 5 && 'Excellent work'}
              {overallRating === 4 && 'Solid service'}
              {overallRating === 3 && 'Acceptable'}
              {overallRating === 2 && 'Needs improvement'}
              {overallRating === 1 && 'Unsatisfactory'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100">
            Checklist Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-5">
          {groupedChecklist.length === 0 ? (
            <div className="rounded-sm border border-dashed border-warm-200 p-4 text-sm text-warm-500 dark:text-cream-400">
              No checklist is assigned to this location yet. You can still rate the visit and
              report issues.
            </div>
          ) : (
            groupedChecklist.map((section) => (
              <div key={section.id} className="space-y-3">
                <div>
                  <h3 className="font-medium text-warm-900 dark:text-cream-100">
                    {section.name}
                  </h3>
                  <Separator className="mt-2" />
                </div>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="border border-warm-200 dark:border-charcoal-700 rounded-sm p-3 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium text-sm text-warm-900 dark:text-cream-100">
                          {item.label}
                        </p>
                        <div className="flex gap-2">
                          {item.requiresPhoto && (
                            <Badge
                              variant="outline"
                              className="rounded-sm text-[10px] border-warm-300"
                            >
                              Photo Required
                            </Badge>
                          )}
                          {item.priority === 'high' && (
                            <Badge className="rounded-sm text-[10px] bg-orange-100 text-orange-700 border-orange-200">
                              High Priority
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant={item.status === 'good' ? 'default' : 'outline'}
                          size="sm"
                          disabled={readOnly}
                          onClick={() => handleChecklistStatus(item.id, 'good')}
                          className={cn(
                            'rounded-sm text-xs',
                            item.status === 'good' && 'bg-lime-600 hover:bg-lime-700'
                          )}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Good
                        </Button>
                        <Button
                          type="button"
                          variant={item.status === 'needs_work' ? 'default' : 'outline'}
                          size="sm"
                          disabled={readOnly}
                          onClick={() => handleChecklistStatus(item.id, 'needs_work')}
                          className={cn(
                            'rounded-sm text-xs',
                            item.status === 'needs_work' && 'bg-orange-600 hover:bg-orange-700'
                          )}
                        >
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          Needs Work
                        </Button>
                        <Button
                          type="button"
                          variant={item.status === 'not_done' ? 'default' : 'outline'}
                          size="sm"
                          disabled={readOnly}
                          onClick={() => handleChecklistStatus(item.id, 'not_done')}
                          className={cn(
                            'rounded-sm text-xs',
                            item.status === 'not_done' && 'bg-red-600 hover:bg-red-700'
                          )}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Not Done
                        </Button>
                      </div>

                      {(item.status === 'needs_work' ||
                        item.status === 'not_done' ||
                        item.requiresPhoto ||
                        item.photos.length > 0 ||
                        item.notes) && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-warm-700 dark:text-cream-300">
                            Notes
                          </Label>
                          <Textarea
                            value={item.notes}
                            disabled={readOnly}
                            onChange={(event) =>
                              handleChecklistNotes(item.id, event.target.value)
                            }
                            placeholder="Add context for anything that needs follow-up..."
                            className="min-h-[80px] rounded-sm border-warm-200 dark:border-charcoal-700"
                          />
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-warm-700 dark:text-cream-300">
                              Photos
                            </Label>
                            {!readOnly && (
                              <div className="flex items-center gap-2">
                                <Label className="inline-flex cursor-pointer items-center rounded-sm border border-warm-200 px-3 py-2 text-xs text-warm-700 dark:border-charcoal-700 dark:text-cream-300">
                                  <ImagePlus className="mr-2 h-3.5 w-3.5" />
                                  {uploadingTarget === `checklist-${item.id}` ? 'Uploading...' : 'Add Photos'}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    multiple
                                    className="hidden"
                                    disabled={uploadingTarget !== null}
                                    onChange={(event) =>
                                      void handleChecklistPhotoUpload(item.id, event.target.files)
                                    }
                                  />
                                </Label>
                              </div>
                            )}
                            {item.photos.length > 0 && (
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {item.photos.map((photo, photoIndex) => (
                                  <Image
                                    key={`${item.id}-photo-${photoIndex}`}
                                    src={photo}
                                    alt={`${item.label} photo ${photoIndex + 1}`}
                                    width={160}
                                    height={80}
                                    className="h-20 w-full rounded-sm border border-warm-200 object-cover dark:border-charcoal-700"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-sm border-red-200">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Pain Points & Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {painPoints.length === 0 ? (
            <p className="text-center text-sm text-warm-500 dark:text-cream-400 py-3">
              No issues reported for this visit.
            </p>
          ) : (
            painPoints.map((point, index) => (
              <div
                key={`${point.category}-${index}`}
                className="border border-red-200 rounded-sm p-3 space-y-3 bg-red-50/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-warm-900">
                    {formatPainPointCategory(point.category)}
                  </p>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePainPoint(index)}
                      className="h-7 w-7 p-0 hover:bg-red-200 rounded-sm"
                    >
                      <XCircle className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-warm-700 dark:text-cream-300">
                    Severity
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['low', 'medium', 'high', 'critical'] as NightlyReviewPainPointSeverity[]).map(
                      (severity) => (
                        <Button
                          key={severity}
                          type="button"
                          variant={point.severity === severity ? 'default' : 'outline'}
                          size="sm"
                          disabled={readOnly}
                          onClick={() => handlePainPointChange(index, { severity })}
                          className={cn(
                            'text-xs rounded-sm',
                            point.severity === severity &&
                              severity === 'low' &&
                              'bg-yellow-500 hover:bg-yellow-600',
                            point.severity === severity &&
                              severity === 'medium' &&
                              'bg-orange-500 hover:bg-orange-600',
                            point.severity === severity &&
                              severity === 'high' &&
                              'bg-red-500 hover:bg-red-600',
                            point.severity === severity &&
                              severity === 'critical' &&
                              'bg-red-700 hover:bg-red-800'
                          )}
                        >
                          {capitalize(severity)}
                        </Button>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-warm-700 dark:text-cream-300">
                    Description
                  </Label>
                  <Textarea
                    value={point.description}
                    disabled={readOnly}
                    onChange={(event) =>
                      handlePainPointChange(index, { description: event.target.value })
                    }
                    placeholder="Describe the issue and any follow-up needed..."
                    className="min-h-[96px] rounded-sm border-warm-200 dark:border-charcoal-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-warm-700 dark:text-cream-300">
                    Photos
                  </Label>
                  {!readOnly && (
                    <Label className="inline-flex cursor-pointer items-center rounded-sm border border-red-200 bg-white px-3 py-2 text-xs text-warm-700">
                      <Camera className="mr-2 h-3.5 w-3.5" />
                      {uploadingTarget === `pain-point-${index}` ? 'Uploading...' : 'Add Issue Photos'}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        className="hidden"
                        disabled={uploadingTarget !== null}
                        onChange={(event) =>
                          void handlePainPointPhotoUpload(index, event.target.files)
                        }
                      />
                    </Label>
                  )}
                  {point.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {point.photos.map((photo, photoIndex) => (
                        <Image
                          key={`${point.category}-${index}-${photoIndex}`}
                          src={photo}
                          alt={`${point.category} photo ${photoIndex + 1}`}
                          width={160}
                          height={80}
                          className="h-20 w-full rounded-sm border border-red-200 object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {!readOnly && (
            <>
              <Separator className="my-4" />
              <p className="text-xs font-medium text-warm-500">Add Issue:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'supply_shortage',
                  'equipment',
                  'staffing',
                  'quality',
                  'safety',
                  'client_feedback',
                ].map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddPainPoint(category)}
                    className={cn(
                      'rounded-sm text-xs',
                      category === 'safety' ? 'border-red-200' : 'border-orange-200'
                    )}
                  >
                    {formatPainPointCategory(category)}
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100">
            Review Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {!readOnly && (
            <Label className="inline-flex cursor-pointer items-center rounded-sm border border-warm-200 px-3 py-2 text-xs text-warm-700 dark:border-charcoal-700 dark:text-cream-300">
              <Camera className="mr-2 h-3.5 w-3.5" />
              {uploadingTarget === 'review-photos' ? 'Uploading...' : 'Add Review Photos'}
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="hidden"
                disabled={uploadingTarget !== null}
                onChange={(event) => void handleReviewPhotoUpload(event.target.files)}
              />
            </Label>
          )}

          {reviewPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {reviewPhotos.map((photo, index) => (
                <Image
                  key={`review-photo-${index}`}
                  src={photo}
                  alt={`Review photo ${index + 1}`}
                  width={192}
                  height={96}
                  className="h-24 w-full rounded-sm border border-warm-200 object-cover dark:border-charcoal-700"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-warm-500 dark:text-cream-400">
              No review photos attached.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100">
            Additional Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Textarea
            value={notes}
            disabled={readOnly}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add any final observations, context, or client-facing notes..."
            className="min-h-[120px] rounded-sm border-warm-200 dark:border-charcoal-700"
          />
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-charcoal-900 border-t border-warm-200 dark:border-charcoal-700 md:relative md:border-0">
          <Button
            onClick={handleSubmitReview}
            disabled={isSaving}
            variant="lime"
            className="w-full h-12 text-base rounded-sm"
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
      )}
    </div>
  )
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatPainPointCategory(category: string) {
  return category
    .split('_')
    .map((part) => capitalize(part))
    .join(' ')
}
