'use client'

// Associate visit screen: one stop on tonight's route.
//
// Clock in → answer every checklist item (Done, or Not done + why) → finish.
// Finishing clocks the associate out and, when anything was not done, raises
// an "Unfinished work" issue that alerts the manager and the client's on-site
// contacts who opted in. Bilingual (EN/ES) because most of the crew reads
// Spanish first.

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Info,
  Languages,
  Loader2,
  LogIn,
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
    serviceNotes: string | null
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

type Answer =
  | { state: 'done' }
  | { state: 'not_done'; reason: string; note: string; photos: string[] }

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
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [busy, setBusy] = useState<null | 'clock' | 'save' | 'finish'>(null)
  const [showAccess, setShowAccess] = useState(false)
  const [missing, setMissing] = useState<Set<string>>(new Set())

  const t = FIELD_STRINGS[lang]

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/field/visit?shiftId=${shiftId}&locationId=${locationId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json)
      setLang(readStoredLang(json.language))
      const restored: Record<string, Answer> = {}
      for (const [id, v] of Object.entries(json.log?.checklistData ?? {})) {
        if (v) restored[id] = { state: 'done' }
      }
      for (const i of (json.log?.incompleteItems ?? []) as IncompleteItem[]) {
        restored[i.itemId] = { state: 'not_done', reason: i.reason, note: i.note ?? '', photos: i.photos ?? [] }
      }
      setAnswers(restored)
      setNotes(json.log?.overallNotes ?? '')
      setPhotos(json.log?.photos ?? [])
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
  const answeredCount = allItems.filter(i => {
    const a = answers[i.id]
    return a && (a.state === 'done' || a.reason)
  }).length
  const notDoneCount = allItems.filter(i => answers[i.id]?.state === 'not_done').length

  const clockIn = data?.log?.clockIn ?? null
  const clockOut = data?.log?.clockOut ?? null
  const finished = Boolean(data?.log?.submittedAt)
  const onTheClock = Boolean(clockIn) && !clockOut && !finished
  // A visit clocked out some other way (old link, manager fix) can still be
  // finished, so it never gets stuck half-done.
  const editable = Boolean(clockIn) && !finished && !data?.readOnly

  function toggleLang() {
    const next = lang === 'en' ? 'es' : 'en'
    setLang(next)
    storeLang(next)
  }

  // Merge into the latest answer (uploads finish after the user may have
  // picked a reason or typed a note, so never spread a stale render's copy).
  function patchNotDone(id: string, patch: Partial<{ reason: string; note: string; photos: string[] }>) {
    setAnswers(prev => {
      const cur = prev[id]
      if (!cur || cur.state !== 'not_done') return prev
      return { ...prev, [id]: { ...cur, ...patch } }
    })
    setMissing(prev => {
      if (!prev.has(id)) return prev
      const copy = new Set(prev)
      copy.delete(id)
      return copy
    })
  }

  function setAnswer(id: string, a: Answer | null) {
    setAnswers(prev => {
      const copy = { ...prev }
      if (a) copy[id] = a
      else delete copy[id]
      return copy
    })
    setMissing(prev => {
      if (!prev.has(id)) return prev
      const copy = new Set(prev)
      copy.delete(id)
      return copy
    })
  }

  async function handleClockIn() {
    setBusy('clock')
    try {
      const res = await fetch('/api/operations/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, locationId, action: 'in' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || t.error)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.error)
    } finally {
      setBusy(null)
    }
  }

  function payload(action: 'save' | 'finish') {
    const done: string[] = []
    const notDone: Array<{ itemId: string; reason: string; note: string; photos: string[] }> = []
    for (const [itemId, a] of Object.entries(answers)) {
      if (a.state === 'done') done.push(itemId)
      else notDone.push({ itemId, reason: a.reason, note: a.note, photos: a.photos })
    }
    return { shiftId, locationId, action, done, notDone, notes, photos }
  }

  async function submit(action: 'save' | 'finish') {
    if (action === 'finish') {
      const unanswered = allItems.filter(i => {
        const a = answers[i.id]
        return !a || (a.state === 'not_done' && (!a.reason || (a.reason === 'other' && !a.note.trim())))
      })
      if (unanswered.length > 0) {
        setMissing(new Set(unanswered.map(i => i.id)))
        toast.error(t.remaining(unanswered.length))
        document.getElementById(`item-${unanswered[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      if (!window.confirm(t.confirmFinish)) return
    }
    setBusy(action)
    try {
      const res = await fetch('/api/field/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(action)),
      })
      const json = await res.json()
      if (res.status === 409 && json.alreadyFinished) {
        // A retry after a dropped response: it already went through.
        await load()
        toast.success(t.finished)
        return
      }
      if (!res.ok) throw new Error(json.error || t.error)
      if (action === 'finish') {
        toast.success(notDoneCount > 0 ? t.finishedWithFlags : t.finished)
        router.push('/dashboard')
      } else {
        toast.success(t.saved)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.error)
    } finally {
      setBusy(null)
    }
  }

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

  const templateName = data.template
    ? (lang === 'es' && data.template.nameEs) || data.template.name
    : undefined
  const hasAccessInfo = Boolean(data.location.accessInstructions || data.location.serviceNotes)

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

      {/* Clock */}
      <Card className="py-0">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full',
                onTheClock
                  ? 'bg-teal-600/10 text-teal-600 dark:bg-teal-300/12 dark:text-teal-300'
                  : clockOut
                    ? 'bg-green-600/12 text-green-600 dark:bg-green-300/12 dark:text-green-300'
                    : 'bg-secondary text-muted-foreground'
              )}
            >
              <Clock className="size-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {clockOut || finished ? t.clockedOut : onTheClock ? t.onTheClock : t.notStarted}
              </p>
              <p className="text-xs text-muted-foreground">
                {clockIn ? `${t.inAt} ${formatTime(clockIn)}` : t.clockInHint}
                {clockOut ? ` · ${t.outAt} ${formatTime(clockOut)}` : ''}
              </p>
            </div>
          </div>
          {!clockIn && !data.readOnly && (
            <Button variant="gold" size="lg" className="gap-2" onClick={handleClockIn} disabled={busy === 'clock'}>
              {busy === 'clock' ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {t.clockIn}
            </Button>
          )}
        </CardContent>
        {allItems.length > 0 && (
          <div className="px-4 pb-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>{answeredCount === allItems.length ? t.allAccounted : t.remaining(allItems.length - answeredCount)}</span>
              <span className="font-mono tabular-nums">
                {answeredCount} {t.of} {allItems.length}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-teal-600 transition-all duration-300 dark:bg-teal-300"
                style={{ width: `${(answeredCount / allItems.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Access + notes for the crew */}
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
              {data.location.serviceNotes && <p>{data.location.serviceNotes}</p>}
            </CardContent>
          )}
        </Card>
      )}

      {finished && (
        <p className="rounded-[9px] border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground">
          {t.finishedNote}
        </p>
      )}

      {/* Checklist */}
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
              <p className="mb-3 font-medium text-foreground">
                {(lang === 'es' && section.nameEs) || section.name}
              </p>
              <div className="divide-y divide-border">
                {section.items.map(item => {
                  const a = answers[item.id]
                  const isMissing = missing.has(item.id)
                  return (
                    <div
                      key={item.id}
                      id={`item-${item.id}`}
                      className={cn('py-3', isMissing && '-mx-2 rounded-[9px] bg-coral-600/5 px-2 ring-1 ring-coral-600/30')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'text-[15px] leading-snug text-foreground',
                              a?.state === 'done' && 'text-muted-foreground line-through'
                            )}
                          >
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
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            disabled={!editable}
                            aria-pressed={a?.state === 'done'}
                            onClick={() => setAnswer(item.id, a?.state === 'done' ? null : { state: 'done' })}
                            className={cn(
                              'flex h-11 min-w-11 items-center justify-center gap-1 rounded-[9px] border px-2.5 text-sm font-medium transition-colors disabled:opacity-50',
                              a?.state === 'done'
                                ? 'border-green-600 bg-green-600 text-white dark:border-green-400 dark:bg-green-500'
                                : 'border-border text-muted-foreground hover:bg-secondary'
                            )}
                          >
                            <Check className="size-4" />
                            <span className="hidden sm:inline">{t.done}</span>
                          </button>
                          <button
                            type="button"
                            disabled={!editable}
                            aria-pressed={a?.state === 'not_done'}
                            onClick={() =>
                              setAnswer(
                                item.id,
                                a?.state === 'not_done' ? null : { state: 'not_done', reason: '', note: '', photos: [] }
                              )
                            }
                            className={cn(
                              'flex h-11 min-w-11 items-center justify-center gap-1 rounded-[9px] border px-2.5 text-sm font-medium transition-colors disabled:opacity-50',
                              a?.state === 'not_done'
                                ? 'border-coral-600 bg-coral-600 text-white dark:border-coral-400 dark:bg-coral-500'
                                : 'border-border text-muted-foreground hover:bg-secondary'
                            )}
                          >
                            <X className="size-4" />
                            <span className="hidden sm:inline">{t.notDone}</span>
                          </button>
                        </div>
                      </div>

                      {a?.state === 'not_done' && (
                        <div className="mt-3 space-y-3 rounded-[9px] border border-coral-600/30 bg-coral-600/5 p-3">
                          <p className="text-sm font-medium text-foreground">{t.whyNotDone}</p>
                          {editable ? (
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {NOT_DONE_REASONS.map(r => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => patchNotDone(item.id, { reason: r.id })}
                                  className={cn(
                                    'min-h-11 rounded-[9px] border px-3 text-left text-sm transition-colors',
                                    a.reason === r.id
                                      ? 'border-coral-600 bg-white font-medium text-foreground dark:bg-black/20'
                                      : 'border-border bg-background text-muted-foreground'
                                  )}
                                >
                                  {r[lang]}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-foreground">{reasonLabel(a.reason, lang)}</p>
                          )}
                          <Textarea
                            value={a.note}
                            disabled={!editable}
                            onChange={e => patchNotDone(item.id, { note: e.target.value })}
                            placeholder={a.reason === 'other' ? t.explain : t.addNote}
                            rows={2}
                          />
                          <PhotoCapture
                            photos={a.photos}
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

      {/* Notes, photos, report a problem */}
      <Card className="py-0">
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">{t.notesLabel}</p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              rows={3}
              disabled={!editable}
            />
          </div>
          <PhotoCapture
            photos={photos}
            onChange={setPhotos}
            max={10}
            label={t.addPhoto}
            uploadingLabel={t.uploading}
            disabled={!editable}
          />
          {!data.readOnly && (
            <ReportProblemButton
              shiftId={shiftId}
              locationId={locationId}
              locationName={data.location.name}
              lang={lang}
              className="w-full"
            />
          )}
        </CardContent>
      </Card>

      {/* Sticky actions: thumb-reachable on phones */}
      {editable && (
        <div className="sticky bottom-20 z-10 rounded-[14px] border border-border bg-background/95 p-3 shadow-card backdrop-blur md:bottom-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => submit('save')}
              disabled={busy !== null}
            >
              {busy === 'save' && <Loader2 className="size-4 animate-spin" />}
              {t.saveProgress}
            </Button>
            <Button
              variant="gold"
              size="lg"
              className="flex-[1.4]"
              onClick={() => submit('finish')}
              disabled={busy !== null}
            >
              {busy === 'finish' ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              {notDoneCount > 0 ? t.finishWithFlags(notDoneCount) : t.finish}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
