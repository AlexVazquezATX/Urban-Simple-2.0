'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { StatCard } from '@/components/ui/stat-card'

type SourceKey = 'tabc' | 'alcohol_sales' | 'places_hotels'
type Settings = {
  enabled: boolean
  dryRun: boolean
  dailyNewCap: number
  sourceCaps: Record<SourceKey, number>
  placesMonthlyCallCap: number
  briefEnabled: boolean
  notifyEmail: string | null
}
type Run = {
  id: string
  stage: string
  status: string
  dryRun: boolean
  startedAt: string
  finishedAt: string | null
  stats: Record<string, unknown> | null
  error: string | null
}
type Status = {
  settings: Settings
  runs: Run[]
  placesCallsThisMonth: number
  addedThisWeek: number
  totalAdded: number
  signals: number
}

const SOURCE_LABELS: Record<SourceKey, string> = {
  tabc: 'New liquor license filings',
  alcohol_sales: 'Texas alcohol sales',
  places_hotels: 'Google hotels and resorts',
}

const STAGE_LABELS: Record<string, string> = {
  sourcing: 'Nightly run',
  tabc: 'License filings',
  alcohol_sales: 'Alcohol sales',
  places_hotels: 'Google hotels',
  health: 'Health check',
  brief: 'Morning brief',
}

function statusTone(status: string): 'green' | 'coral' | 'neutral' | 'gold' {
  if (status === 'succeeded') return 'green'
  if (status === 'failed') return 'coral'
  if (status === 'running') return 'gold'
  return 'neutral'
}

function summarize(run: Run): string {
  if (run.error) return run.error
  const s = run.stats ?? {}
  if (run.stage === 'sourcing') {
    const made = run.dryRun ? `would add ${s.wouldCreate ?? 0}` : `added ${s.created ?? 0}`
    return `${s.candidates ?? 0} candidates, ${s.matchedExisting ?? 0} already in CRM, ${made}`
  }
  if (typeof s.reason === 'string') return s.reason
  if (run.stage === 'places_hotels') return `${s.candidates ?? 0} hotels from ${s.placesCalls ?? 0} calls`
  if (run.stage === 'alcohol_sales') return `${s.candidates ?? 0} accounts from ${s.month ?? '?'} sales`
  if (run.stage === 'tabc') return `${s.candidates ?? 0} businesses from ${s.rows ?? 0} filings`
  if (run.stage === 'brief') return `Sent by ${s.channel ?? 'nothing'}`
  if (run.stage === 'health') {
    return Array.isArray(s.problems) && s.problems.length ? (s.problems as string[]).join('; ') : 'All clear'
  }
  return ''
}

export function LeadMachineClient() {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [caps, setCaps] = useState<{ daily: string; places: string; sources: Record<SourceKey, string> } | null>(null)
  const capsDirty = useRef(false)

  const load = useCallback(async (opts: { resetCaps?: boolean } = {}) => {
    const res = await fetch('/api/growth/machine')
    if (!res.ok) {
      toast.error('Could not load the lead machine')
      return
    }
    const data = (await res.json()) as Status
    setStatus(data)
    // Keep unsaved cap edits when a switch or run refreshes the page data.
    if (!capsDirty.current || opts.resetCaps) {
      capsDirty.current = false
      setCaps({
        daily: String(data.settings.dailyNewCap),
        places: String(data.settings.placesMonthlyCallCap),
        sources: Object.fromEntries(
          Object.entries(data.settings.sourceCaps).map(([k, v]) => [k, String(v)]),
        ) as Record<SourceKey, string>,
      })
    }
  }, [])

  function editCaps(next: { daily: string; places: string; sources: Record<SourceKey, string> }) {
    setCaps(next)
    capsDirty.current = true
  }

  useEffect(() => {
    void load()
  }, [load])

  async function patch(body: Partial<Settings>, label: string) {
    setBusy(label)
    try {
      const res = await fetch('/api/growth/machine', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success('Saved')
      await load({ resetCaps: label === 'caps' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  async function run(stage: string, extra: Record<string, unknown> = {}) {
    setBusy(stage)
    try {
      const res = await fetch('/api/growth/machine/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Run failed')
      if (stage === 'sourcing') {
        const r = data.result
        toast.success(r.dryRun
          ? `Dry run: ${r.candidates} candidates, ${r.matchedExisting} already in CRM, would add ${r.createdNames.length}`
          : `Added ${r.created} new accounts`)
      } else if (stage === 'brief') {
        toast.success(data.channel ? `Brief sent by ${data.channel}` : 'The brief could not be sent')
      } else {
        toast.success('Done')
      }
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setBusy(null)
    }
  }

  function saveCaps() {
    if (!caps) return
    // An empty box must not silently become 0 (which turns a source off).
    const toInt = (v: string) => (v.trim() === '' ? NaN : Number(v.trim()))
    const sourceCaps = Object.fromEntries(Object.entries(caps.sources).map(([k, v]) => [k, toInt(v)]))
    if ([toInt(caps.daily), toInt(caps.places), ...Object.values(sourceCaps)].some((n) => !Number.isInteger(n) || n < 0)) {
      toast.error('Caps must be whole numbers, 0 or more')
      return
    }
    void patch({
      dailyNewCap: toInt(caps.daily),
      placesMonthlyCallCap: toInt(caps.places),
      sourceCaps: sourceCaps as Record<SourceKey, number>,
    }, 'caps')
  }

  if (!status || !caps) {
    return <p className="text-sm text-muted-foreground">Loading the lead machine…</p>
  }
  const s = status.settings
  const lastNightly = status.runs.find((r) => r.stage === 'sourcing')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Machine"
          value={s.enabled ? (s.dryRun ? 'Dry run' : 'Live') : 'Off'}
          tone={s.enabled ? (s.dryRun ? 'gold' : 'green') : 'neutral'}
          sub={lastNightly ? `Last run ${new Date(lastNightly.startedAt).toLocaleString()}` : 'Has not run yet'}
        />
        <StatCard label="Added this week" value={status.addedThisWeek} sub={`${status.totalAdded} all time`} />
        <StatCard label="Signals on file" value={status.signals} sub="Licenses, sales, listings" />
        <StatCard
          label="Google Places"
          value={`${status.placesCallsThisMonth} / ${s.placesMonthlyCallCap}`}
          sub="Calls this month"
          tone={status.placesCallsThisMonth >= s.placesMonthlyCallCap ? 'coral' : 'neutral'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Switches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="lm-enabled">Run every night</Label>
                <p className="text-sm text-muted-foreground">Finds accounts at 2 a.m. and sends a brief at 7:30 a.m., Austin time. Off stops both.</p>
              </div>
              <Switch id="lm-enabled" checked={s.enabled} disabled={!!busy} onCheckedChange={(v) => patch({ enabled: v }, 'enabled')} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="lm-dry">Dry run</Label>
                <p className="text-sm text-muted-foreground">Report what it would add without touching the CRM. Turn off to start adding accounts.</p>
              </div>
              <Switch id="lm-dry" checked={s.dryRun} disabled={!!busy} onCheckedChange={(v) => patch({ dryRun: v }, 'dryRun')} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="lm-brief">Morning brief</Label>
                <p className="text-sm text-muted-foreground">Telegram when a bot is set up, email otherwise.</p>
              </div>
              <Switch id="lm-brief" checked={s.briefEnabled} disabled={!!busy} onCheckedChange={(v) => patch({ briefEnabled: v }, 'brief')} />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" disabled={!!busy} onClick={() => run('sourcing', { dryRun: true })}>
                {busy === 'sourcing' ? 'Running…' : 'Dry run now'}
              </Button>
              <Button variant="outline" size="sm" disabled={!!busy} onClick={() => run('brief')}>
                {busy === 'brief' ? 'Sending…' : 'Send brief now'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily caps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="lm-daily">New accounts per day</Label>
                <Input id="lm-daily" inputMode="numeric" value={caps.daily} onChange={(e) => editCaps({ ...caps, daily: e.target.value })} />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="lm-places">Google calls per month</Label>
                <Input id="lm-places" inputMode="numeric" value={caps.places} onChange={(e) => editCaps({ ...caps, places: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Most new accounts per day from each source (0 turns a source off):</p>
              {(Object.keys(SOURCE_LABELS) as SourceKey[]).map((k) => (
                <div key={k} className="flex items-center justify-between gap-4">
                  <Label htmlFor={`lm-src-${k}`} className="font-normal">{SOURCE_LABELS[k]}</Label>
                  <Input
                    id={`lm-src-${k}`}
                    inputMode="numeric"
                    className="w-20"
                    value={caps.sources[k]}
                    onChange={(e) => editCaps({ ...caps, sources: { ...caps.sources, [k]: e.target.value } })}
                  />
                </div>
              ))}
            </div>
            <Button size="sm" disabled={!!busy} onClick={saveCaps}>{busy === 'caps' ? 'Saving…' : 'Save caps'}</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run log</CardTitle>
        </CardHeader>
        <CardContent>
          {status.runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing has run yet. Use Dry run now to see what the machine would find tonight.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">When</th>
                    <th className="py-2 pr-4 font-medium">Stage</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">What happened</th>
                  </tr>
                </thead>
                <tbody>
                  {status.runs.map((r) => (
                    <tr key={r.id} className="border-b align-top last:border-0">
                      <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{new Date(r.startedAt).toLocaleString()}</td>
                      <td className="whitespace-nowrap py-2 pr-4">{STAGE_LABELS[r.stage] ?? r.stage}{r.dryRun ? ' (dry)' : ''}</td>
                      <td className="py-2 pr-4"><Badge variant={statusTone(r.status)}>{r.status}</Badge></td>
                      <td className="py-2 text-muted-foreground">{summarize(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
