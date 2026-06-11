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
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="kicker mb-1 text-primary">OPERATIONS · NIGHTLY REVIEW</div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-[-0.4px] text-foreground">
              {locationName}
            </h1>
            {readOnly && <Badge variant="green">Submitted</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{clientName}</p>
          {submittedLabel && (
            <p className="text-xs text-muted-foreground mt-1">
              Submitted {submittedLabel}
            </p>
          )}
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">{address}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">
              {serviceDateLabel} at{' '}
              <span className="font-mono tabular-nums">{scheduledTime}</span>
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">
              Associate: {associateName}
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">
              Checklist: {checklistName}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">
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
                    rating <= overallRating
                      ? 'fill-gold-600 text-gold-600 dark:fill-gold-400 dark:text-gold-400'
                      : 'text-border'
                  )}
                />
              </button>
            ))}
          </div>
          {overallRating > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {overallRating === 5 && 'Excellent work'}
              {overallRating === 4 && 'Solid service'}
              {overallRating === 3 && 'Acceptable'}
              {overallRating === 2 && 'Needs improvement'}
              {overallRating === 1 && 'Unsatisfactory'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">
            Checklist Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-5">
          {groupedChecklist.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border p-4 text-sm text-muted-foreground">
              No checklist is assigned to this location yet. You can still rate the visit and
              report issues.
            </div>
          ) : (
            groupedChecklist.map((section) => (
              <div key={section.id} className="space-y-3">
                <div>
                  <h3 className="font-display text-[15px] font-semibold tracking-[-0.2px] text-foreground">
                    {section.name}
                  </h3>
                  <Separator className="mt-2" />
                </div>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="border border-border rounded-[10px] p-3 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium text-sm text-foreground">
                          {item.label}
                        </p>
                        <div className="flex gap-2">
                          {item.requiresPhoto && (
                            <Badge variant="neutral" className="text-[10px]">
                              Photo Required
                            </Badge>
                          )}
                          {item.priority === 'high' && (
                            <Badge variant="coral" className="text-[10px]">
                              High Priority
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={readOnly}
                          onClick={() => handleChecklistStatus(item.id, 'good')}
                          className={cn(
                            'text-xs',
                            item.status === 'good' &&
                              'border-green-600/40 bg-green-600/10 text-green-600 hover:bg-green-600/15 hover:text-green-600 dark:border-green-300/40 dark:bg-green-300/12 dark:text-green-300 dark:hover:bg-green-300/15 dark:hover:text-green-300'
                          )}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Good
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={readOnly}
                          onClick={() => handleChecklistStatus(item.id, 'needs_work')}
                          className={cn(
                            'text-xs',
                            item.status === 'needs_work' &&
                              'border-gold-600/40 bg-gold-600/10 text-gold-600 hover:bg-gold-600/15 hover:text-gold-600 dark:border-gold-400/40 dark:bg-gold-400/12 dark:text-gold-400 dark:hover:bg-gold-400/15 dark:hover:text-gold-400'
                          )}
                        >
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          Needs Work
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={readOnly}
                          onClick={() => handleChecklistStatus(item.id, 'not_done')}
                          className={cn(
                            'text-xs',
                            item.status === 'not_done' &&
                              'border-coral-600/40 bg-coral-600/10 text-coral-600 hover:bg-coral-600/15 hover:text-coral-600 dark:border-coral-300/40 dark:bg-coral-300/12 dark:text-coral-300 dark:hover:bg-coral-300/15 dark:hover:text-coral-300'
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
                          <Label>Notes</Label>
                          <Textarea
                            value={item.notes}
                            disabled={readOnly}
                            onChange={(event) =>
                              handleChecklistNotes(item.id, event.target.value)
                            }
                            placeholder="Add context for anything that needs follow-up..."
                            className="min-h-[80px]"
                          />
                          <div className="space-y-2">
                            <Label>Photos</Label>
                            {!readOnly && (
                              <div className="flex items-center gap-2">
                                <Label className="inline-flex cursor-pointer items-center rounded-[9px] border border-input px-3 py-2 font-sans text-xs normal-case tracking-normal text-foreground transition-colors hover:bg-secondary/60">
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
                                    className="h-20 w-full rounded-[9px] border border-border object-cover"
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

      <Card className="gap-0 py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-coral-600 dark:text-coral-300" />
            Pain Points & Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {painPoints.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-3">
              No issues reported for this visit.
            </p>
          ) : (
            painPoints.map((point, index) => (
              <div
                key={`${point.category}-${index}`}
                className="rounded-[10px] border border-coral-600/30 bg-coral-600/10 p-3 space-y-3 dark:border-coral-300/25 dark:bg-coral-300/12"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-foreground">
                    {formatPainPointCategory(point.category)}
                  </p>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePainPoint(index)}
                      className="h-7 w-7 p-0 hover:bg-coral-600/15 dark:hover:bg-coral-300/15"
                    >
                      <XCircle className="h-3.5 w-3.5 text-coral-600 dark:text-coral-300" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Severity</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['low', 'medium', 'high', 'critical'] as NightlyReviewPainPointSeverity[]).map(
                      (severity) => (
                        <Button
                          key={severity}
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={readOnly}
                          onClick={() => handlePainPointChange(index, { severity })}
                          className={cn(
                            'text-xs bg-background',
                            point.severity === severity &&
                              severity === 'low' &&
                              'border-foreground/20 bg-secondary text-foreground hover:bg-secondary',
                            point.severity === severity &&
                              severity === 'medium' &&
                              'border-gold-600/40 bg-gold-600/10 text-gold-600 hover:bg-gold-600/15 hover:text-gold-600 dark:border-gold-400/40 dark:bg-gold-400/12 dark:text-gold-400 dark:hover:bg-gold-400/15 dark:hover:text-gold-400',
                            point.severity === severity &&
                              severity === 'high' &&
                              'border-coral-600/40 bg-coral-600/15 text-coral-600 hover:bg-coral-600/20 hover:text-coral-600 dark:border-coral-300/40 dark:bg-coral-300/15 dark:text-coral-300 dark:hover:bg-coral-300/20 dark:hover:text-coral-300',
                            point.severity === severity &&
                              severity === 'critical' &&
                              'border-coral-600 bg-coral-600 text-white hover:bg-coral-600/90 hover:text-white dark:border-coral-300 dark:bg-coral-300 dark:text-ink-950 dark:hover:bg-coral-300/90 dark:hover:text-ink-950'
                          )}
                        >
                          {capitalize(severity)}
                        </Button>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={point.description}
                    disabled={readOnly}
                    onChange={(event) =>
                      handlePainPointChange(index, { description: event.target.value })
                    }
                    placeholder="Describe the issue and any follow-up needed..."
                    className="min-h-[96px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Photos</Label>
                  {!readOnly && (
                    <Label className="inline-flex cursor-pointer items-center rounded-[9px] border border-input bg-background px-3 py-2 font-sans text-xs normal-case tracking-normal text-foreground transition-colors hover:bg-secondary/60">
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
                          className="h-20 w-full rounded-[9px] border border-border object-cover"
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
              <p className="kicker text-muted-foreground">Add Issue</p>
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
                    className="text-xs"
                  >
                    {formatPainPointCategory(category)}
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">
            Review Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {!readOnly && (
            <Label className="inline-flex cursor-pointer items-center rounded-[9px] border border-input px-3 py-2 font-sans text-xs normal-case tracking-normal text-foreground transition-colors hover:bg-secondary/60">
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
                  className="h-24 w-full rounded-[9px] border border-border object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No review photos attached.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">
            Additional Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Textarea
            value={notes}
            disabled={readOnly}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add any final observations, context, or client-facing notes..."
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 md:relative md:border-0 md:bg-transparent md:p-0">
          <Button
            onClick={handleSubmitReview}
            disabled={isSaving}
            variant="gold"
            className="w-full h-12 text-base"
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
