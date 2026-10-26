'use client'

// Associate visit screen: one stop on tonight's route, built to take seconds.
//
// Exceptions only: once clocked in, every checklist item counts as done. The
// associate taps just what they couldn't finish and picks why. Everything
// autosaves; one big button finishes the visit and clocks them out. Items
// marked not done become an "Unfinished work" issue that alerts the manager
// and the client's on-site contacts who opted in. Bilingual (EN/ES).

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  CloudOff,
  Info,
  Languages,
  Loader2,
  MapPin,
  MessageSquarePlus,
  SearchX,
  X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PhotoCapture } from '@/components/field/photo-capture'
import { ReportProblemButton } from '@/components/field/report-problem-dialog'
import { FIELD_STRINGS, readStoredLang, storeLang, type FieldLang } from '@/lib/ops/field-i18n'
import { NOT_DONE_REASONS, reasonLabel, type IncompleteItem } from '@/lib/ops/constants'
import { cn } from '@/lib/utils'

interface Item {
  id: string
  text: string
  textEs?: string | null
  requiresPhoto?: boolean
  priority?: string
}
interface Section {
  id: string
  name: string
  nameEs?: string | null
  items: Item[]
}
interface VisitData {
  language: FieldLang
  readOnly: boolean
  location: {
    id: string
    name: string
    clientName: string
    accessInstructions: string | null
    painPoints: string | null
  }
  template: { id: string; name: string; nameEs: string | null; sections: Section[] } | null
  log: {
    id: string
    clockIn: string | null
    clockOut: string | null
    checklistData: Record<string, boolean>
    incompleteItems: IncompleteItem[]
    overallNotes: string | null
    photos: string[]
    submittedAt: string | null
    issueId: string | null
  } | null
}

interface NotDone {
  reason: string
  note: string
  photos: string[]
  text?: string // typed-in items not on the checklist (id 'custom-…')
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function formatTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''
}

export default function FieldVisitPage({
  params,
}: {
  params: Promise<{ shiftId: string; locationId: string }>
}) {
  const { shiftId, locationId } = use(params)
  const router = useRouter()

  const [data, setData] = useState<VisitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<FieldLang>('en')
  // Only exceptions are stored; any item not in here counts as done.
  const [notDone, setNotDone] = useState<Record<string, NotDone>>({})
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [showNotes, setShowNotes] = useState(false)
  const [showAccess, setShowAccess] = useState(false)
  const [busy, setBusy] = useState<null | 'clock' | 'finish'>(null)
  const [confirmArmed, setConfirmArmed] = useState(false)
  const [missing, setMissing] = useState<Set<string>>(new Set())
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const dirty = useRef(false)

  const t = FIELD_STRINGS[lang]

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/field/visit?shiftId=${shiftId}&locationId=${locationId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json)
      setLang(readStoredLang(json.language))
      const restored: Record<string, NotDone> = {}
      for (const i of (json.log?.incompleteItems ?? []) as IncompleteItem[]) {
        restored[i.itemId] = {
          reason: i.reason,
          note: i.note ?? '',
          photos: i.photos ?? [],
          ...(i.itemId.startsWith('custom-') ? { text: i.text } : {}),
        }
      }
      setNotDone(restored)
      setNotes(json.log?.overallNotes ?? '')
      setPhotos(json.log?.photos ?? [])
      if (json.log?.overallNotes || json.log?.photos?.length) setShowNotes(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [shiftId, locationId])

  useEffect(() => {
    load()
  }, [load])

  const sections = useMemo(() => data?.template?.sections ?? [], [data])
  const allItems = useMemo(() => sections.flatMap(s => s.items), [sections])
  const notDoneCount = Object.keys(notDone).length
  const customIds = Object.keys(notDone).filter(id => id.startsWith('custom-'))
  const needsReason = [
    ...allItems.map(i => i.id),
    ...customIds,
  ].filter(id => {
    const n = notDone[id]
    return (
      n &&
      (!n.reason || (n.reason === 'other' && !n.note.trim()) || (id.startsWith('custom-') && !n.text?.trim()))
    )
  })

  const clockIn = data?.log?.clockIn ?? null
  const clockOut = data?.log?.clockOut ?? null
  const finished = Boolean(data?.log?.submittedAt)
  // Clocked out some other way but never finished: still finishable.
  const editable = Boolean(clockIn) && !finished && !data?.readOnly

  // ---- autosave -----------------------------------------------------------
  const payload = useCallback(
    (action: 'save' | 'finish') => ({
      shiftId,
      locationId,
      action,
      done: allItems.filter(i => !notDone[i.id]).map(i => i.id),
      notDone: Object.entries(notDone).map(([itemId, n]) => ({ itemId, ...n })),
      notes,
      photos,
    }),
    [shiftId, locationId, allItems, notDone, notes, photos]
  )

  const save = useCallback(async () => {
    if (!dirty.current) return
    dirty.current = false
    setSaveState('saving')
    try {
      const res = await fetch('/api/field/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload('save')),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
    } catch {
      dirty.current = true
      setSaveState('error')
    }
  }, [payload])

  // Save shortly after any change; retry while a save is failing.
  useEffect(() => {
    if (!editable || !dirty.current) return
    const timer = setTimeout(save, saveState === 'error' ? 5000 : 800)
    return () => clearTimeout(timer)
  }, [editable, notDone, notes, photos, saveState, save])

  // Phone locked or screen left mid-visit: flush right away (keepalive lets
  // the request finish after the page goes away).
  const payloadRef = useRef(payload)
  useEffect(() => {
    payloadRef.current = payload
  }, [payload])
  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return
      dirty.current = false
      fetch('/api/field/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadRef.current('save')),
        keepalive: true,
      }).catch(() => {
        dirty.current = true
      })
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [])

  // First load of a fresh visit: persist the "everything done" baseline so
  // leaving the screen still leaves a complete record.
  const baselineSaved = useRef(false)
  useEffect(() => {
    if (!editable || baselineSaved.current || allItems.length === 0) return
    baselineSaved.current = true
    const savedAny =
      Object.keys(data?.log?.checklistData ?? {}).length > 0 || (data?.log?.incompleteItems.length ?? 0) > 0
    if (!savedAny) {
      dirty.current = true
      setSaveState('idle')
      setTimeout(save, 0)
    }
  }, [editable, allItems.length, data, save])

  function markDirty() {
    dirty.current = true
    setConfirmArmed(false)
  }

  // ---- item actions -------------------------------------------------------
  function addCustom() {
    const id = `custom-${Date.now().toString(36)}`
    setNotDone(prev => ({ ...prev, [id]: { reason: '', note: '', photos: [], text: '' } }))
    markDirty()
    setTimeout(() => document.getElementById(`custom-text-${id}`)?.focus(), 50)
  }

  function markNotDone(id: string) {
    setNotDone(prev => ({ ...prev, [id]: prev[id] ?? { reason: '', note: '', photos: [] } }))
    markDirty()
  }

  function markDone(id: string) {
    setNotDone(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    setMissing(prev => {
      const copy = new Set(prev)
      copy.delete(id)
      return copy
    })
    markDirty()
  }

  // Merge into the latest value (uploads can finish after the user has picked
  // a reason or typed a note).
  function patchNotDone(id: string, patch: Partial<NotDone>) {
    setNotDone(prev => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev))
    setMissing(prev => {
      if (!prev.has(id)) return prev
      const copy = new Set(prev)
      copy.delete(id)
      return copy
    })
    markDirty()
  }

  function toggleLang() {
    const next = lang === 'en' ? 'es' : 'en'
    setLang(next)
    storeLang(next)
  }

  // ---- clock in / finish --------------------------------------------------
  async function handleArrive() {
    setBusy('clock')
    try {
      const res = await fetch('/api/operations/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, locationId, action: 'in' }),
      })
      if (!res.ok && res.status !== 409) throw new Error((await res.json().catch(() => ({}))).error || t.error)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.error)
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    if (!confirmArmed) return
    const timer = setTimeout(() => setConfirmArmed(false), 5000)
    return () => clearTimeout(timer)
  }, [confirmArmed])

  async function finish() {
    if (needsReason.length > 0) {
      setMissing(new Set(needsReason))
      toast.error(t.needsReason(needsReason.length))
      document.getElementById(`item-${needsReason[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!confirmArmed) {
      setConfirmArmed(true)
      return
    }
    setConfirmArmed(false)
    setBusy('finish')
    try {
      const res = await fetch('/api/field/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload('finish')),
      })
      const json = await res.json()
      if (!res.ok && !(res.status === 409 && json.alreadyFinished)) throw new Error(json.error || t.error)
      dirty.current = false
      toast.success(notDoneCount > 0 ? t.finishedWithFlags : t.finished)
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.error)
    } finally {
      setBusy(null)
    }
  }

  // ---- render -------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-6 animate-spin" />
        {t.loading}
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={SearchX}
        title={t.error}
        action={
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            {t.back}
          </Button>
        }
      />
    )
  }

  const templateName = data.template ? (lang === 'es' && data.template.nameEs) || data.template.name : undefined
  const hasAccessInfo = Boolean(data.location.accessInstructions)
  const showChecklist = Boolean(clockIn) || finished || data.readOnly

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        kicker={t.tonightKicker}
        title={data.location.name}
        subtitle={[data.location.clientName, templateName].filter(Boolean).join(' · ')}
        backHref="/dashboard"
        actions={
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={toggleLang}>
            <Languages className="size-4" />
            {t.language}
          </Button>
        }
      />

      {data.readOnly && <Badge variant="neutral">{t.readOnly}</Badge>}

      {/* Not here yet: one big tap */}
      {!clockIn && !finished && !data.readOnly && (
        <Button
          variant="gold"
          className="h-16 w-full gap-2 text-lg"
          onClick={handleArrive}
          disabled={busy === 'clock'}
        >
          {busy === 'clock' ? <Loader2 className="size-5 animate-spin" /> : <MapPin className="size-5" />}
          {t.imHere}
        </Button>
      )}

      {/* Clock + save status, one quiet line */}
      {(clockIn || finished) && (
        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-card px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-foreground">
            <Clock className="size-4 text-muted-foreground" />
            {finished || clockOut
              ? `${t.clockedOut} · ${t.inAt} ${formatTime(clockIn)}${clockOut ? ` · ${t.outAt} ${formatTime(clockOut)}` : ''}`
              : `${t.onTheClock} ${t.sinceTime(formatTime(clockIn))}`}
          </span>
          {editable && saveState !== 'idle' && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                saveState === 'error' ? 'text-coral-600 dark:text-coral-300' : 'text-muted-foreground'
              )}
            >
              {saveState === 'saving' && <Loader2 className="size-3 animate-spin" />}
              {saveState === 'saved' && <Check className="size-3" />}
              {saveState === 'error' && <CloudOff className="size-3" />}
              {saveState === 'saving' ? t.saving : saveState === 'saved' ? t.savedAuto : t.saveFailed}
            </span>
          )}
        </div>
      )}

      {hasAccessInfo && (
        <Card className="py-0">
          <button
            type="button"
            className="flex w-full items-center justify-between p-4 text-left"
            onClick={() => setShowAccess(v => !v)}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Info className="size-4 text-muted-foreground" />
              {t.accessInfo}
            </span>
            <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', showAccess && 'rotate-180')} />
          </button>
          {showAccess && (
            <CardContent className="space-y-2 whitespace-pre-wrap px-4 pb-4 text-sm text-muted-foreground">
              {data.location.accessInstructions && <p>{data.location.accessInstructions}</p>}
            </CardContent>
          )}
        </Card>
      )}

      {data.location.painPoints && !finished && (
        <div className="rounded-[12px] border border-gold-600/30 bg-gold-600/10 px-4 py-3 text-sm text-foreground">
          <span className="font-semibold">{t.watchOutFor}: </span>
          <span className="whitespace-pre-wrap">{data.location.painPoints}</span>
        </div>
      )}

      {!clockIn && !finished && !data.readOnly && (
        <p className="text-center text-sm text-muted-foreground">{t.clockInHint}</p>
      )}

      {finished && (
        <p className="rounded-[9px] border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
          {t.finishedNote}
        </p>
      )}

      {showChecklist && (
        <>
          {allItems.length > 0 && editable && (
            <p
              className={cn(
                'rounded-[12px] px-4 py-3 text-sm font-medium',
                notDoneCount === 0
                  ? 'bg-green-600/10 text-green-700 dark:bg-green-300/10 dark:text-green-300'
                  : 'bg-coral-600/10 text-coral-700 dark:bg-coral-300/10 dark:text-coral-300'
              )}
            >
              {notDoneCount === 0 ? t.allMarkedDone(allItems.length) : t.someNotDone(notDoneCount)}
            </p>
          )}

          {sections.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState icon={CheckCircle} title={t.noChecklist} description={t.noChecklistHint} />
              </CardContent>
            </Card>
          ) : (
            sections.map(section => (
              <Card key={section.id} className="py-0">
                <CardContent className="p-4">
                  <p className="mb-1 font-medium text-foreground">
                    {(lang === 'es' && section.nameEs) || section.name}
                  </p>
                  <div className="divide-y divide-border">
                    {section.items.map(item => {
                      const n = notDone[item.id]
                      const isMissing = missing.has(item.id)
                      // Finished visits show what was actually recorded.
                      const done = !n && (editable || data.log?.checklistData?.[item.id] === true)
                      return (
                        <div
                          key={item.id}
                          id={`item-${item.id}`}
                          className={cn(
                            'py-3',
                            isMissing && '-mx-2 rounded-[9px] bg-coral-600/5 px-2 ring-1 ring-coral-600/30'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'grid size-7 shrink-0 place-items-center rounded-full',
                                n
                                  ? 'bg-coral-600 text-white dark:bg-coral-500'
                                  : done
                                    ? 'bg-green-600/12 text-green-600 dark:bg-green-300/12 dark:text-green-300'
                                    : 'bg-secondary text-muted-foreground'
                              )}
                            >
                              {n ? <X className="size-4" /> : <Check className="size-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-[15px] leading-snug text-foreground', n && 'font-medium')}>
                                {(lang === 'es' && item.textEs) || item.text}
                              </p>
                              {(item.priority === 'high' || item.requiresPhoto) && (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {item.priority === 'high' && (
                                    <Badge variant="gold" className="text-[10px]">
                                      {t.priority}
                                    </Badge>
                                  )}
                                  {item.requiresPhoto && (
                                    <Badge variant="neutral" className="text-[10px]">
                                      {t.photoRequired}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            {editable && !n && (
                              <button
                                type="button"
                                onClick={() => markNotDone(item.id)}
                                className="h-11 shrink-0 rounded-[9px] border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary active:bg-secondary"
                              >
                                {t.notDone}
                              </button>
                            )}
                          </div>

                          {n && (
                            <div className="mt-3 space-y-3 rounded-[9px] border border-coral-600/30 bg-coral-600/5 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-foreground">{t.whyNotDone}</p>
                                {editable && (
                                  <button
                                    type="button"
                                    onClick={() => markDone(item.id)}
                                    className="h-9 rounded-[9px] px-2 text-sm font-medium text-green-700 underline-offset-2 hover:underline dark:text-green-300"
                                  >
                                    {t.itGotDone}
                                  </button>
                                )}
                              </div>
                              {editable ? (
                                <div className="grid gap-1.5 sm:grid-cols-2">
                                  {NOT_DONE_REASONS.map(r => (
                                    <button
                                      key={r.id}
                                      type="button"
                                      onClick={() => patchNotDone(item.id, { reason: r.id })}
                                      className={cn(
                                        'min-h-11 rounded-[9px] border px-3 text-left text-sm transition-colors',
                                        n.reason === r.id
                                          ? 'border-coral-600 bg-coral-600 font-medium text-white dark:border-coral-400 dark:bg-coral-500'
                                          : 'border-border bg-background text-muted-foreground'
                                      )}
                                    >
                                      {r[lang]}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-foreground">{reasonLabel(n.reason, lang)}</p>
                              )}
                              {(editable || n.note) && (
                                <Textarea
                                  value={n.note}
                                  disabled={!editable}
                                  onChange={e => patchNotDone(item.id, { note: e.target.value })}
                                  placeholder={n.reason === 'other' ? t.explain : t.addNote}
                                  rows={2}
                                />
                              )}
                              <PhotoCapture
                                photos={n.photos}
                                onChange={p => patchNotDone(item.id, { photos: p })}
                                label={t.addPhoto}
                                uploadingLabel={t.uploading}
                                disabled={!editable}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Things not on the checklist that didn't get done */}
          {customIds.length > 0 && (
            <Card className="py-0">
              <CardContent className="space-y-4 p-4">
                <p className="font-medium text-foreground">{t.somethingElse}</p>
                {customIds.map(id => {
                  const n = notDone[id]
                  return (
                    <div
                      key={id}
                      id={`item-${id}`}
                      className={cn(
                        'space-y-3 rounded-[9px] border border-coral-600/30 bg-coral-600/5 p-3',
                        missing.has(id) && 'ring-1 ring-coral-600/40'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Textarea
                          id={`custom-text-${id}`}
                          value={n.text ?? ''}
                          disabled={!editable}
                          onChange={e => patchNotDone(id, { text: e.target.value })}
                          placeholder={t.somethingElsePlaceholder}
                          rows={2}
                          className="flex-1"
                        />
                        {editable && (
                          <button
                            type="button"
                            onClick={() => markDone(id)}
                            className="h-9 shrink-0 rounded-[9px] px-2 text-sm text-muted-foreground underline-offset-2 hover:underline"
                          >
                            {t.remove}
                          </button>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{t.whyNotDone}</p>
                      {editable ? (
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {NOT_DONE_REASONS.map(r => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => patchNotDone(id, { reason: r.id })}
                              className={cn(
                                'min-h-11 rounded-[9px] border px-3 text-left text-sm transition-colors',
                                n.reason === r.id
                                  ? 'border-coral-600 bg-coral-600 font-medium text-white dark:border-coral-400 dark:bg-coral-500'
                                  : 'border-border bg-background text-muted-foreground'
                              )}
                            >
                              {r[lang]}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-foreground">{reasonLabel(n.reason, lang)}</p>
                      )}
                      {(editable || n.note) && (
                        <Textarea
                          value={n.note}
                          disabled={!editable}
                          onChange={e => patchNotDone(id, { note: e.target.value })}
                          placeholder={n.reason === 'other' ? t.explain : t.addNote}
                          rows={2}
                        />
                      )}
                      <PhotoCapture
                        photos={n.photos}
                        onChange={p => patchNotDone(id, { photos: p })}
                        label={t.addPhoto}
                        uploadingLabel={t.uploading}
                        disabled={!editable}
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {editable && (
            <button
              type="button"
              onClick={addCustom}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-coral-600/40 text-sm font-medium text-coral-700 dark:text-coral-300"
            >
              <X className="size-4" />
              {t.somethingElse}
            </button>
          )}

          {/* Optional extras, tucked away */}
          {editable && !showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-border py-3 text-sm text-muted-foreground"
            >
              <MessageSquarePlus className="size-4" />
              {t.noteForManager}
            </button>
          ) : (
            (showNotes || notes || photos.length > 0) && (
              <Card className="py-0">
                <CardContent className="space-y-3 p-4">
                  <Textarea
                    value={notes}
                    onChange={e => {
                      setNotes(e.target.value)
                      markDirty()
                    }}
                    placeholder={t.notesPlaceholder}
                    rows={3}
                    disabled={!editable}
                  />
                  <PhotoCapture
                    photos={photos}
                    onChange={p => {
                      setPhotos(p)
                      markDirty()
                    }}
                    max={10}
                    label={t.addPhoto}
                    uploadingLabel={t.uploading}
                    disabled={!editable}
                  />
                </CardContent>
              </Card>
            )
          )}
        </>
      )}

      {!data.readOnly && !finished && (
        <ReportProblemButton
          shiftId={shiftId}
          locationId={locationId}
          locationName={data.location.name}
          lang={lang}
          className="w-full"
        />
      )}

      {/* One big finish button, thumb-reachable */}
      {editable && (
        <div className="sticky bottom-20 z-10 rounded-[14px] border border-border bg-background/95 p-3 shadow-card backdrop-blur md:bottom-4">
          <Button
            variant="gold"
            className={cn(
              'h-14 w-full gap-2 text-base',
              notDoneCount > 0 && !confirmArmed && 'bg-coral-600 text-white hover:bg-coral-600/90'
            )}
            onClick={finish}
            disabled={busy !== null}
          >
            {busy === 'finish' ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
            {confirmArmed ? t.tapToConfirm : notDoneCount > 0 ? t.finishWithFlags(notDoneCount) : t.finishAllDone}
          </Button>
        </div>
      )}
    </div>
  )
}
