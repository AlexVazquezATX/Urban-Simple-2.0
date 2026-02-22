'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Bot,
  Search,
  Sparkles,
  AtSign,
  Target,
  Mail,
  Clock,
  Play,
  Loader2,
  Plus,
  X,
  RefreshCw,
  Filter,
  ListChecks,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentConfig {
  id?: string
  companyId: string
  isEnabled: boolean
  isDryRun: boolean
  targetLocations: Array<{ city: string; state: string }>
  targetBusinessTypes: string[]
  targetSources: string[]
  minRating: number | null
  priceLevels: string[]
  minScoreForOutreach: number
  batchSize: number
  maxDiscoveriesPerDay: number
  maxEmailsPerDay: number
  maxOutreachPerDay: number
  outreachTone: string
  outreachChannel: string
  activeHoursStart: number
  activeHoursEnd: number
  timezone: string
  processingMode: 'all' | 'filtered' | 'queued'
  filterCriteria: {
    businessTypes?: string[]
    priceLevels?: string[]
    cities?: string[]
    tags?: string[]
    sources?: string[]
  }
}

interface AgentStats {
  funnel: {
    total: number
    new: number
    enriched: number
    withEmails: number
    scored: number
    withOutreach: number
    pendingApproval: number
  }
  today: {
    discovered: number
    enriched: number
    emailsFound: number
    scored: number
    outreachGenerated: number
  }
  limits: {
    discoveries: { used: number; max: number }
    emails: { used: number; max: number }
    outreach: { used: number; max: number }
  } | null
  discoveredThisWeek: number
  queuedCount: number
  filteredCount: number | null
  processingMode: string
}

interface AgentRun {
  id: string
  stage: string
  status: string
  isDryRun: boolean
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
  itemsSkipped: number
  durationMs: number | null
  startedAt: string
  details: any
  errorMessage: string | null
}

const BUSINESS_TYPES = [
  'restaurant',
  'bar',
  'hotel',
  'brewery',
  'cafe',
  'food_truck',
  'catering',
  'bakery',
]

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GrowthAgentDashboard() {
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null)

  // New location form
  const [newCity, setNewCity] = useState('')
  const [newState, setNewState] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [configRes, statsRes, runsRes] = await Promise.all([
        fetch('/api/growth/agent/config'),
        fetch('/api/growth/agent/stats'),
        fetch('/api/growth/agent/runs?limit=20'),
      ])

      if (configRes.ok) {
        const data = await configRes.json()
        // Ensure new fields have defaults for configs created before this migration
        setConfig({
          ...data.config,
          processingMode: data.config.processingMode || 'all',
          filterCriteria: data.config.filterCriteria || {},
        })
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
      if (runsRes.ok) {
        const data = await runsRes.json()
        setRuns(data.runs)
      }
    } catch (error) {
      console.error('Error fetching agent data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleToggle = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/growth/agent/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      setConfig((prev) => prev ? { ...prev, isEnabled: data.enabled } : prev)
      toast.success(enabled ? 'Agent enabled' : 'Agent disabled')
    } catch {
      toast.error('Failed to toggle agent')
    }
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/growth/agent/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      setConfig(data.config)
      toast.success('Configuration saved')
    } catch {
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleTrigger = async (stage?: string) => {
    const label = stage || 'full cycle'
    setTriggerLoading(label)
    try {
      const res = await fetch('/api/growth/agent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: stage || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      if (data.stage === 'none') {
        toast.info(data.details?.reason || 'No work pending')
      } else {
        toast.success(
          `${data.stage}: ${data.itemsSucceeded} succeeded, ${data.itemsFailed} failed${data.isDryRun ? ' (dry run)' : ''}`
        )
      }
      fetchData()
    } catch {
      toast.error('Failed to trigger agent')
    } finally {
      setTriggerLoading(null)
    }
  }

  const addLocation = () => {
    if (!newCity.trim() || !newState.trim() || !config) return
    setConfig({
      ...config,
      targetLocations: [...config.targetLocations, { city: newCity.trim(), state: newState.trim() }],
    })
    setNewCity('')
    setNewState('')
  }

  const removeLocation = (index: number) => {
    if (!config) return
    setConfig({
      ...config,
      targetLocations: config.targetLocations.filter((_, i) => i !== index),
    })
  }

  const toggleBusinessType = (type: string) => {
    if (!config) return
    const types = config.targetBusinessTypes.includes(type)
      ? config.targetBusinessTypes.filter((t) => t !== type)
      : [...config.targetBusinessTypes, type]
    setConfig({ ...config, targetBusinessTypes: types })
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading agent dashboard...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Growth Agent</h1>
            <p className="text-sm text-gray-500">
              Autonomous lead discovery, enrichment, and outreach pipeline
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {config?.isDryRun && config?.isEnabled && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Dry Run
            </Badge>
          )}
          <Badge
            variant={config?.isEnabled ? 'default' : 'secondary'}
            className={config?.isEnabled ? 'bg-green-600' : ''}
          >
            {config?.isEnabled
              ? config?.isDryRun
                ? 'Active (Dry Run)'
                : 'Active'
              : 'Disabled'}
          </Badge>
          <Switch
            checked={config?.isEnabled || false}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>

      {/* Pipeline Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<Search className="h-4 w-4" />}
            label="Discovered Today"
            value={stats.today.discovered}
            limit={stats.limits?.discoveries}
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Enriched"
            value={stats.funnel.enriched}
          />
          <StatCard
            icon={<AtSign className="h-4 w-4" />}
            label="With Emails"
            value={stats.funnel.withEmails}
          />
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Scored"
            value={stats.funnel.scored}
          />
          <StatCard
            icon={<Mail className="h-4 w-4" />}
            label="Outreach Drafted"
            value={stats.funnel.withOutreach}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Pending Approval"
            value={stats.funnel.pendingApproval}
            highlight={stats.funnel.pendingApproval > 0}
          />
          {stats.queuedCount > 0 && (
            <StatCard
              icon={<ListChecks className="h-4 w-4" />}
              label="In Queue"
              value={stats.queuedCount}
              highlight
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Set targets, rate limits, and outreach preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {config && (
              <>
                {/* Processing Mode */}
                <div className="space-y-2">
                  <Label className="font-semibold">Processing Mode</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Controls which prospects the agent processes through the pipeline
                  </p>
                  <div className="flex rounded-lg border overflow-hidden">
                    {([
                      { value: 'all' as const, label: 'All Prospects', icon: Globe, desc: 'Process everything' },
                      { value: 'filtered' as const, label: 'Filtered', icon: Filter, desc: 'Match criteria' },
                      { value: 'queued' as const, label: 'Queued Only', icon: ListChecks, desc: 'Hand-picked' },
                    ]).map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setConfig({ ...config, processingMode: mode.value })}
                        className={cn(
                          'flex-1 px-3 py-2.5 text-sm font-medium transition-colors border-r last:border-r-0',
                          config.processingMode === mode.value
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <mode.icon className="h-3.5 w-3.5" />
                          {mode.label}
                        </div>
                        <div className="text-[10px] font-normal opacity-70">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Criteria (shown when mode is 'filtered') */}
                {config.processingMode === 'filtered' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Label className="font-semibold text-blue-800">Filter Criteria</Label>
                    <p className="text-xs text-blue-600">
                      Agent will only process prospects matching these criteria
                    </p>

                    {/* Business Types filter */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Business Types</Label>
                      <div className="flex flex-wrap gap-2">
                        {BUSINESS_TYPES.map((type) => (
                          <label key={type} className="flex items-center gap-1.5 text-sm">
                            <Checkbox
                              checked={(config.filterCriteria.businessTypes || []).includes(type)}
                              onCheckedChange={(checked) => {
                                const current = config.filterCriteria.businessTypes || []
                                const updated = checked
                                  ? [...current, type]
                                  : current.filter((t) => t !== type)
                                setConfig({
                                  ...config,
                                  filterCriteria: { ...config.filterCriteria, businessTypes: updated },
                                })
                              }}
                            />
                            <span className="capitalize">{type.replace('_', ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Price Levels filter */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Price Levels</Label>
                      <div className="flex gap-3">
                        {['$', '$$', '$$$', '$$$$'].map((level) => (
                          <label key={level} className="flex items-center gap-1.5 text-sm">
                            <Checkbox
                              checked={(config.filterCriteria.priceLevels || []).includes(level)}
                              onCheckedChange={(checked) => {
                                const current = config.filterCriteria.priceLevels || []
                                const updated = checked
                                  ? [...current, level]
                                  : current.filter((l) => l !== level)
                                setConfig({
                                  ...config,
                                  filterCriteria: { ...config.filterCriteria, priceLevels: updated },
                                })
                              }}
                            />
                            <span>{level}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Cities filter */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Cities</Label>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {(config.filterCriteria.cities || []).map((city, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {city}
                            <button
                              onClick={() => {
                                const updated = (config.filterCriteria.cities || []).filter((_, idx) => idx !== i)
                                setConfig({ ...config, filterCriteria: { ...config.filterCriteria, cities: updated } })
                              }}
                              className="ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="Type city name, press Enter"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim()
                            if (val) {
                              const current = config.filterCriteria.cities || []
                              setConfig({
                                ...config,
                                filterCriteria: { ...config.filterCriteria, cities: [...current, val] },
                              })
                              ;(e.target as HTMLInputElement).value = ''
                            }
                          }
                        }}
                        className="w-48"
                      />
                    </div>

                    {/* Tags filter */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Tags</Label>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {(config.filterCriteria.tags || []).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                            <button
                              onClick={() => {
                                const updated = (config.filterCriteria.tags || []).filter((_, idx) => idx !== i)
                                setConfig({ ...config, filterCriteria: { ...config.filterCriteria, tags: updated } })
                              }}
                              className="ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="Type tag name, press Enter"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim()
                            if (val) {
                              const current = config.filterCriteria.tags || []
                              setConfig({
                                ...config,
                                filterCriteria: { ...config.filterCriteria, tags: [...current, val] },
                              })
                              ;(e.target as HTMLInputElement).value = ''
                            }
                          }
                        }}
                        className="w-48"
                      />
                    </div>

                    {/* Show matching count */}
                    {stats?.filteredCount !== null && stats?.filteredCount !== undefined && (
                      <p className="text-sm text-blue-700 font-medium">
                        {stats.filteredCount} prospects match these criteria
                      </p>
                    )}
                  </div>
                )}

                {/* Queue info (shown when mode is 'queued') */}
                {config.processingMode === 'queued' && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-semibold text-purple-800">Agent Queue</Label>
                        <p className="text-xs text-purple-600 mt-1">
                          Select prospects in the Prospects table and click &quot;Queue for Agent&quot; to add them
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-800">{stats?.queuedCount || 0}</p>
                        <p className="text-xs text-purple-600">in queue</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Target Locations */}
                <div className="space-y-2">
                  <Label className="font-semibold">Target Locations</Label>
                  <div className="space-y-2">
                    {config.targetLocations.map((loc, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {loc.city}, {loc.state}
                        </span>
                        <button onClick={() => removeLocation(i)} className="text-red-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="City"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        className="w-40"
                      />
                      <Select value={newState} onValueChange={setNewState}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={addLocation}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Business Types */}
                <div className="space-y-2">
                  <Label className="font-semibold">Business Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_TYPES.map((type) => (
                      <label key={type} className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={config.targetBusinessTypes.includes(type)}
                          onCheckedChange={() => toggleBusinessType(type)}
                        />
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Min Score */}
                <div className="space-y-2">
                  <Label className="font-semibold">
                    Min Score for Outreach: {config.minScoreForOutreach}
                  </Label>
                  <Slider
                    value={[config.minScoreForOutreach]}
                    onValueChange={(values: number[]) => setConfig({ ...config, minScoreForOutreach: values[0] })}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>

                {/* Outreach Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select
                      value={config.outreachTone}
                      onValueChange={(v) => setConfig({ ...config, outreachTone: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select
                      value={config.outreachChannel}
                      onValueChange={(v) => setConfig({ ...config, outreachChannel: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rate Limits */}
                <div className="space-y-2">
                  <Label className="font-semibold">Daily Rate Limits</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Discoveries</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={config.maxDiscoveriesPerDay}
                        onChange={(e) =>
                          setConfig({ ...config, maxDiscoveriesPerDay: parseInt(e.target.value) || 20 })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Emails</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={config.maxEmailsPerDay}
                        onChange={(e) =>
                          setConfig({ ...config, maxEmailsPerDay: parseInt(e.target.value) || 10 })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Outreach</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={config.maxOutreachPerDay}
                        onChange={(e) =>
                          setConfig({ ...config, maxOutreachPerDay: parseInt(e.target.value) || 10 })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Dry Run */}
                <div className="flex items-center justify-between bg-amber-50 p-3 rounded-lg">
                  <div>
                    <Label className="font-semibold">Dry Run Mode</Label>
                    <p className="text-xs text-gray-500">
                      When enabled, the agent logs what it would do without creating real records
                    </p>
                  </div>
                  <Switch
                    checked={config.isDryRun}
                    onCheckedChange={(v) => setConfig({ ...config, isDryRun: v })}
                  />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Configuration
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent agent runs</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {runs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No runs yet</p>
              ) : (
                runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <StageBadge stage={run.stage} />
                      <StatusBadge status={run.status} />
                      {run.isDryRun && (
                        <Badge variant="outline" className="text-xs">dry</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-gray-500 text-xs">
                      <span>
                        {run.itemsSucceeded}/{run.itemsProcessed}
                      </span>
                      {run.durationMs && <span>{(run.durationMs / 1000).toFixed(1)}s</span>}
                      <span>{new Date(run.startedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Controls</CardTitle>
          <CardDescription>Trigger individual pipeline stages or a full cycle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[
              { stage: 'discover', label: 'Discovery', icon: Search },
              { stage: 'enrich', label: 'Enrichment', icon: Sparkles },
              { stage: 'find_emails', label: 'Email Finder', icon: AtSign },
              { stage: 'score', label: 'Scoring', icon: Target },
              { stage: 'generate_outreach', label: 'Outreach', icon: Mail },
            ].map(({ stage, label, icon: Icon }) => (
              <Button
                key={stage}
                variant="outline"
                onClick={() => handleTrigger(stage)}
                disabled={triggerLoading !== null}
              >
                {triggerLoading === stage ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Icon className="h-4 w-4 mr-2" />
                )}
                Run {label}
              </Button>
            ))}
            <Button
              onClick={() => handleTrigger()}
              disabled={triggerLoading !== null}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {triggerLoading === 'full cycle' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Full Cycle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  limit,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: number
  limit?: { used: number; max: number } | null
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? 'border-amber-300 bg-amber-50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-gray-500 mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {limit && (
          <p className="text-xs text-gray-400 mt-1">
            {limit.used}/{limit.max} today
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    discover: 'bg-blue-100 text-blue-700',
    enrich: 'bg-purple-100 text-purple-700',
    find_emails: 'bg-green-100 text-green-700',
    score: 'bg-orange-100 text-orange-700',
    generate_outreach: 'bg-pink-100 text-pink-700',
  }
  return (
    <Badge variant="secondary" className={`text-xs ${colors[stage] || ''}`}>
      {stage.replace('_', ' ')}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-yellow-100 text-yellow-700',
    skipped: 'bg-gray-100 text-gray-500',
  }
  return (
    <Badge variant="secondary" className={`text-xs ${colors[status] || ''}`}>
      {status}
    </Badge>
  )
}
