'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle,
  ChevronRight,
  ClipboardList,
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
import { ISSUE_CATEGORIES, reasonLabel } from '@/lib/ops/constants'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { useManagerLang } from '@/lib/i18n/use-manager-lang'
import {
  categoryLabelFor,
  localeFor,
  type ManagerLang,
  type ManagerStrings,
} from '@/lib/i18n/manager'
import { toIssueCategory } from '@/lib/operations/review-categories'
import type {
  NightlyReviewAssociateReport,
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
  /** Shift.date as ISO (a calendar date stored at UTC midnight). */
  serviceDate: string
  associateName: string | null
  checklistName: string | null
  checklistItems: NightlyReviewChecklistItemState[]
  initialRating: number
  initialNotes: string
  initialPainPoints: NightlyReviewPainPoint[]
  initialPhotos: string[]
  readOnly?: boolean
  submittedAt?: string | null
  associateReport?: NightlyReviewAssociateReport | null
  timezone?: string
}

export function NightlyReviewForm({
  reviewTargetId,
  shiftId,
  locationId,
  locationName,
  clientName,
  address,
  scheduledTime,
  serviceDate,
  associateName,
  checklistName,
  checklistItems: initialChecklistItems,
  initialRating,
  initialNotes,
  initialPainPoints,
  initialPhotos,
  readOnly = false,
  submittedAt,
  associateReport = null,
  timezone = 'America/Chicago',
}: NightlyReviewFormProps) {
  const router = useRouter()
  const { lang, t } = useManagerLang()
  const f = t.form
  const [isSaving, setIsSaving] = useState(false)
  const [overallRating, setOverallRating] = useState(initialRating)
  const [checklistItems, setChecklistItems] = useState(initialChecklistItems)
  const [painPoints, setPainPoints] = useState(() =>
    initialPainPoints.map((point) => ({ ...point, category: toIssueCategory(point.category) }))
  )
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
        name: item.sectionName || t.common.general,
        items: [],
      }
      section.items.push(item)
      sections.set(key, section)
    })

    return Array.from(sections.values())
  }, [checklistItems, t])

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
            throw new Error(payload.error || f.toastReviewPhotoFailed)
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
      toast.success(f.toastReviewPhoto)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : f.toastReviewPhotoFailed)
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
      toast.success(f.toastChecklistPhoto)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : f.toastChecklistPhotoFailed)
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
      toast.success(f.toastIssuePhoto)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : f.toastIssuePhotoFailed)
    }
  }

  const handleRemovePainPoint = (index: number) => {
    if (readOnly) return

    setPainPoints((current) => current.filter((_, pointIndex) => pointIndex !== index))
  }

  const handleSubmitReview = async () => {
    if (readOnly) return

    if (overallRating === 0) {
      toast.error(f.toastNeedRating)
      return
    }

    const pendingItems = checklistItems.filter((item) => item.status === 'pending')
    if (pendingItems.length > 0) {
      toast.error(f.toastNeedAllItems)
      return
    }

    const incompletePainPoints = painPoints.filter((point) => !point.description.trim())
    if (incompletePainPoints.length > 0) {
      toast.error(f.toastNeedDescriptions)
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
        throw new Error(payload.error || f.toastSubmitFailed)
      }

      toast.success(f.toastSubmitted)
      router.push('/operations/nightly-reviews')
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : f.toastSubmitFailed)
    } finally {
      setIsSaving(false)
    }
  }

  // Calendar date at UTC midnight: format in UTC or it shows the day before.
  const serviceDateLabel = new Date(serviceDate).toLocaleDateString(localeFor(lang), {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleString(localeFor(lang), {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
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
          <div className="kicker mb-1 text-primary">{f.kicker}</div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-[-0.4px] text-foreground">
              {locationName}
            </h1>
            {readOnly && <Badge variant="green">{f.submitted}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{clientName}</p>
          {submittedLabel && (
            <p className="text-xs text-muted-foreground mt-1">
              {f.submittedAt(submittedLabel)}
            </p>
          )}
        </div>
        <LanguageToggle className="mt-1" />
      </div>

      {associateReport && (
        <AssociateReportPanel report={associateReport} timezone={timezone} lang={lang} t={t} />
      )}

      <Card className="py-0">
        <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">{address}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">
              {serviceDateLabel} {f.at}{' '}
              <span className="font-mono tabular-nums">{scheduledTime}</span>
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">
              {f.associate}: {associateName || t.common.unassigned}
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">
              {f.checklist}: {checklistName || t.common.noChecklist}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">{f.ratingTitle}</CardTitle>
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
              {f.rating[overallRating]}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">{f.checklistTitle}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-5">
          {groupedChecklist.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-border p-4 text-sm text-muted-foreground">
              {f.noChecklist}
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
                              {f.photoRequired}
                            </Badge>
                          )}
                          {item.priority === 'high' && (
                            <Badge variant="coral" className="text-[10px]">
                              {f.highPriority}
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
                          {f.good}
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
                          {f.needsWork}
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
                          {f.notDone}
                        </Button>
                      </div>

                      {(item.status === 'needs_work' ||
                        item.status === 'not_done' ||
                        item.requiresPhoto ||
                        item.photos.length > 0 ||
                        item.notes) && (
                        <div className="space-y-2">
                          <Label>{f.notes}</Label>
                          <Textarea
                            value={item.notes}
                            disabled={readOnly}
                            onChange={(event) =>
                              handleChecklistNotes(item.id, event.target.value)
                            }
                            placeholder={f.notesPlaceholder}
                            className="min-h-[80px]"
                          />
                          <div className="space-y-2">
                            <Label>{t.common.photos}</Label>
                            {!readOnly && (
                              <div className="flex items-center gap-2">
                                <Label className="inline-flex cursor-pointer items-center rounded-[9px] border border-input px-3 py-2 font-sans text-xs normal-case tracking-normal text-foreground transition-colors hover:bg-secondary/60">
                                  <ImagePlus className="mr-2 h-3.5 w-3.5" />
                                  {uploadingTarget === `checklist-${item.id}` ? t.common.uploading : f.addPhotos}
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
                                    alt={f.photoAlt(item.label, photoIndex + 1)}
                                    width={160}
                                    height={80}
                                    unoptimized
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
            {f.painPoints}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {painPoints.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-3">
              {f.noPainPoints}
            </p>
          ) : (
            painPoints.map((point, index) => (
              <div
                key={`${point.category}-${index}`}
                className="rounded-[10px] border border-coral-600/30 bg-coral-600/10 p-3 space-y-3 dark:border-coral-300/25 dark:bg-coral-300/12"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-foreground">
                    {categoryLabelFor(toIssueCategory(point.category), undefined, lang)}
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
                  <Label>{f.severity}</Label>
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
                          {t.severity[severity]}
                        </Button>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{f.description}</Label>
                  <Textarea
                    value={point.description}
                    disabled={readOnly}
                    onChange={(event) =>
                      handlePainPointChange(index, { description: event.target.value })
                    }
                    placeholder={f.descriptionPlaceholder}
                    className="min-h-[96px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.common.photos}</Label>
                  {!readOnly && (
                    <Label className="inline-flex cursor-pointer items-center rounded-[9px] border border-input bg-background px-3 py-2 font-sans text-xs normal-case tracking-normal text-foreground transition-colors hover:bg-secondary/60">
                      <Camera className="mr-2 h-3.5 w-3.5" />
                      {uploadingTarget === `pain-point-${index}` ? t.common.uploading : f.addIssuePhotos}
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
                          alt={f.photoAlt(point.category, photoIndex + 1)}
                          width={160}
                          height={80}
                          unoptimized
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
              <p className="kicker text-muted-foreground">{f.addIssue}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ISSUE_CATEGORIES.map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddPainPoint(category.id)}
                    className="text-xs"
                  >
                    {t.category[category.id] ?? category.label}
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">{f.reviewPhotos}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {!readOnly && (
            <Label className="inline-flex cursor-pointer items-center rounded-[9px] border border-input px-3 py-2 font-sans text-xs normal-case tracking-normal text-foreground transition-colors hover:bg-secondary/60">
              <Camera className="mr-2 h-3.5 w-3.5" />
              {uploadingTarget === 'review-photos' ? t.common.uploading : f.addReviewPhotos}
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
                  alt={f.reviewPhotoAlt(index + 1)}
                  width={192}
                  height={96}
                  unoptimized
                  className="h-24 w-full rounded-[9px] border border-border object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{f.noReviewPhotos}</p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">{f.additionalNotes}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Textarea
            value={notes}
            disabled={readOnly}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={f.additionalNotesPlaceholder}
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
                {f.submitting}
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                {f.submit}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

function formatClock(iso: string | null, timezone: string, lang: ManagerLang) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString(localeFor(lang), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  })
}

function formatDuration(fromIso: string, toIso: string) {
  const minutes = Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

function PhotoStrip({ photos, alt }: { photos: string[]; alt: string }) {
  if (photos.length === 0) return null
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {photos.map((photo, index) => (
        <a
          key={`${photo}-${index}`}
          href={photo}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Image
            src={photo}
            alt={`${alt} ${index + 1}`}
            width={120}
            height={64}
            unoptimized
            className="h-16 w-full rounded-[9px] border border-border object-cover"
          />
        </a>
      ))}
    </div>
  )
}

function AssociateReportPanel({
  report,
  timezone,
  lang,
  t,
}: {
  report: NightlyReviewAssociateReport
  timezone: string
  lang: ManagerLang
  t: ManagerStrings
}) {
  const rp = t.form.report
  const clockIn = formatClock(report.clockIn, timezone, lang)
  const clockOut = formatClock(report.clockOut, timezone, lang)
  const stillOnSite = Boolean(report.clockIn && !report.clockOut)
  const percent =
    report.checklistTotal > 0 ? Math.round((report.checklistDone / report.checklistTotal) * 100) : 0

  const statusBadge = report.submittedAt ? (
    <Badge variant="green">{t.stopStatus.submitted}</Badge>
  ) : stillOnSite ? (
    <Badge variant="teal">{rp.onSite}</Badge>
  ) : (
    <Badge variant="neutral">{rp.notSubmitted}</Badge>
  )

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 shrink-0 text-gold-600 dark:text-gold-400" />
          <CardTitle className="text-base">{rp.title}</CardTitle>
          <span className="flex-1" />
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">{report.associateName}</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground">
              {clockIn ? (
                <>
                  <span className="font-mono tabular-nums">
                    {clockIn} – {clockOut ?? rp.stillOnSite}
                  </span>
                  {report.clockIn && report.clockOut && (
                    <span className="text-muted-foreground">
                      {' '}
                      · {formatDuration(report.clockIn, report.clockOut)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">{rp.noClockIn}</span>
              )}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">
              <span className="font-mono tabular-nums font-semibold">
                {report.checklistDone} {rp.of} {report.checklistTotal}
              </span>{' '}
              {rp.done}
            </span>
            {report.incompleteItems.length > 0 && (
              <Badge variant="coral">{t.common.notDone(report.incompleteItems.length)}</Badge>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gold-600 transition-all duration-300 dark:bg-gold-400"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {report.incompleteItems.length > 0 && (
          <div className="space-y-2">
            <p className="kicker text-muted-foreground">{rp.markedNotDone}</p>
            {report.incompleteItems.map((item) => (
              <div
                key={item.itemId}
                className="rounded-[10px] border border-coral-600/30 bg-coral-600/10 p-3 space-y-2 dark:border-coral-300/25 dark:bg-coral-300/12"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.text}</p>
                  {item.section && (
                    <p className="text-xs text-muted-foreground">{item.section}</p>
                  )}
                </div>
                <p className="text-xs font-semibold text-coral-600 dark:text-coral-300">
                  {reasonLabel(item.reason, lang)}
                </p>
                {item.note && <p className="text-sm text-foreground">{item.note}</p>}
                <PhotoStrip photos={item.photos ?? []} alt={`${item.text} · ${t.common.photo}`} />
              </div>
            ))}
          </div>
        )}

        {report.incompleteIssueId && (
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href={`/operations/issues/${report.incompleteIssueId}`}>
              {rp.openIssue}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        )}

        {report.overallNotes && (
          <div className="space-y-1">
            <p className="kicker text-muted-foreground">{rp.theirNotes}</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{report.overallNotes}</p>
          </div>
        )}

        {report.photos.length > 0 && (
          <div className="space-y-2">
            <p className="kicker text-muted-foreground">{rp.theirPhotos}</p>
            <PhotoStrip photos={report.photos} alt={rp.associatePhoto} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
