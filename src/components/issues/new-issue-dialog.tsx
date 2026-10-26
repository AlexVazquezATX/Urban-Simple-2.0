'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, ClipboardX, Loader2, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ISSUE_CATEGORIES, NOT_DONE_REASONS, SEVERITIES } from '@/lib/ops/constants'
import { useManagerLang } from '@/lib/i18n/use-manager-lang'
import { cn } from '@/lib/utils'

export interface LocationOption {
  id: string
  name: string
  client: { id: string; name: string }
}

const MAX_PHOTOS = 6
const MAX_ITEMS = 10

type Mode = 'issue' | 'unfinished'
interface UnfinishedRow {
  text: string
  reason: string
}
const blankRow = (): UnfinishedRow => ({ text: '', reason: 'out_of_time' })

export function NewIssueDialog({
  locations,
  defaultLocationId,
  defaultMode = 'issue',
  defaultOpen = false,
  onCreated,
  children,
}: {
  locations: LocationOption[]
  defaultLocationId?: string
  defaultMode?: Mode
  /** Open on mount (deep link from the dashboard). */
  defaultOpen?: boolean
  onCreated?: () => void
  children: React.ReactNode
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(defaultOpen)
  const [search, setSearch] = useState('')
  const [locationId, setLocationId] = useState(defaultLocationId ?? '')
  const [category, setCategory] = useState('quality')
  const [severity, setSeverity] = useState('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [visibleToClient, setVisibleToClient] = useState(false)
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [rows, setRows] = useState<UnfinishedRow[]>([blankRow()])
  const [notifyClient, setNotifyClient] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { lang, t } = useManagerLang()
  const n = t.newIssue
  const unfinished = mode === 'unfinished'
  const filledRows = rows.filter((r) => r.text.trim())
  const canSubmit = !!locationId && (unfinished ? filledRows.length > 0 : !!title.trim())

  const updateRow = (idx: number, patch: Partial<UnfinishedRow>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  const selected = locations.find((l) => l.id === locationId)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? locations.filter((l) => l.name.toLowerCase().includes(q) || l.client.name.toLowerCase().includes(q))
      : locations
    return list.slice(0, 60)
  }, [locations, search])

  const reset = () => {
    setSearch('')
    setLocationId(defaultLocationId ?? '')
    setCategory('quality')
    setSeverity('medium')
    setTitle('')
    setDescription('')
    setPhotos([])
    setVisibleToClient(false)
    setMode(defaultMode)
    setRows([blankRow()])
    setNotifyClient(true)
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const room = MAX_PHOTOS - photos.length
    const batch = Array.from(files).slice(0, room)
    if (batch.length === 0) {
      toast.error(n.maxPhotos(MAX_PHOTOS))
      return
    }
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of batch) {
        const form = new FormData()
        form.append('file', file)
        form.append('folder', 'issues')
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || n.uploadFailed)
        urls.push(data.url)
      }
      setPhotos((prev) => [...prev, ...urls])
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : n.uploadFailed)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const payload = unfinished
        ? {
            type: 'incomplete_work',
            locationId,
            items: filledRows.map((r) => ({
              text: r.text.trim(),
              reason: r.reason,
            })),
            photos,
            notifyClient,
          }
        : {
            locationId,
            category,
            severity,
            title: title.trim(),
            description: description.trim() || undefined,
            photos,
            visibleToClient,
          }
      const res = await fetch('/api/issues', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || n.createFailed)
      toast.success(unfinished ? (notifyClient ? n.loggedSent : n.loggedInternal) : n.created)
      setOpen(false)
      reset()
      onCreated?.()
      router.push(`/operations/issues/${data.id}`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : n.createFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{unfinished ? n.unfinishedTitle : n.title}</DialogTitle>
          <DialogDescription>{unfinished ? n.unfinishedDescription : n.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-border bg-secondary/40 p-1">
            {(['issue', 'unfinished'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-[7px] px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'issue' ? n.modeIssue : n.modeUnfinished}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>{n.location}</Label>
            {selected ? (
              <div className="flex items-center justify-between gap-2 rounded-[9px] border border-border bg-secondary/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{selected.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{selected.client.name}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setLocationId('')}>
                  {n.change}
                </Button>
              </div>
            ) : (
              <div className="rounded-[9px] border border-border">
                <div className="flex items-center gap-2 border-b border-border px-3">
                  <Search className="size-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={n.searchPlaceholder}
                    className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground">{n.noMatches}</p>
                  ) : (
                    filtered.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLocationId(l.id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-secondary/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-foreground">{l.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {l.client.name}
                          </span>
                        </span>
                        {l.id === locationId && <Check className="size-4 text-primary" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {unfinished ? (
            <div className="space-y-2">
              <Label>{n.whatNotDone}</Label>
              {rows.map((row, idx) => (
                <div key={idx} className="space-y-2 rounded-[12px] border border-border p-2.5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={row.text}
                      onChange={(e) => updateRow(idx, { text: e.target.value })}
                      placeholder={n.itemPlaceholder}
                      maxLength={200}
                      aria-label={n.whatNotDone}
                    />
                    {rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={n.removeItem}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                  <Select value={row.reason} onValueChange={(v) => updateRow(idx, { reason: v })}>
                    <SelectTrigger className="w-full" aria-label={n.reason}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOT_DONE_REASONS.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r[lang]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {rows.length < MAX_ITEMS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRows((prev) => [...prev, blankRow()])}
                >
                  <Plus className="size-4" />
                  {n.addItem}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">{n.clientSeesHint}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-issue-category">{n.category}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="new-issue-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {t.category[c.id] ?? c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-issue-severity">{n.severity}</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger id="new-issue-severity" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t.severity[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-issue-title">{n.issueTitle}</Label>
                <Input
                  id="new-issue-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={n.titlePlaceholder}
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-issue-description">{n.details}</Label>
                <Textarea
                  id="new-issue-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={n.detailsPlaceholder}
                  rows={4}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>{n.photos}</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((url) => (
                <div key={url} className="relative size-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="size-16 rounded-[10px] border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                    className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
                    aria-label={n.removePhoto}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    'grid size-16 place-items-center rounded-[10px] border border-dashed border-border text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground',
                    uploading && 'opacity-60',
                  )}
                  aria-label={n.addPhotos}
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <label className="flex items-start justify-between gap-3 rounded-[12px] border border-border bg-secondary/40 p-3">
            <span>
              <span className="block text-sm font-medium text-foreground">
                {unfinished ? n.notifyClient : n.visible}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {unfinished ? n.notifyClientHint : n.visibleHint}
              </span>
            </span>
            {unfinished ? (
              <Switch checked={notifyClient} onCheckedChange={setNotifyClient} />
            ) : (
              <Switch checked={visibleToClient} onCheckedChange={setVisibleToClient} />
            )}
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            variant="gold"
            onClick={handleSubmit}
            disabled={saving || uploading || !canSubmit}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : unfinished ? (
              <ClipboardX className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {unfinished ? n.logUnfinished : n.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
