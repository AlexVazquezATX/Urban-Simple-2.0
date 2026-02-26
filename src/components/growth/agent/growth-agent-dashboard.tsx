'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  ChevronDown,
  ChevronRight,
  AlertTriangle,
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
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)
  const [cfCity, setCfCity] = useState('')
  const [cfState, setCfState] = useState('')
  const [cfTypes, setCfTypes] = useState<string[]>(['restaurant'])
  const [cfTarget, setCfTarget] = useState(10)
  const [cfLoading, setCfLoading] = useState(false)
  const [cfResult, setCfResult] = useState<any>(null)

  // Track unsaved config edits so auto-refresh doesn't overwrite them
  const configDirty = useRef(false)

  // Wrapper that marks config as dirty whenever the user edits locally
  const updateConfig = useCallback((updater: AgentConfig | ((prev: AgentConfig | null) => AgentConfig | null)) => {
    configDirty.current = true
    if (typeof updater === 'function') {
      setConfig(updater)
    } else {
      setConfig(updater)
    }
  }, [])

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

      if (configRes.ok && !configDirty.current) {
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
      configDirty.current = false
      setConfig(data.config)
      toast.success('Configuration saved')
    } catch {
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleTrigger = async (stage?: string, fullPipeline?: boolean) => {
    const label = fullPipeline ? 'full pipeline' : (stage || 'full cycle')
    setTriggerLoading(label)
    try {
      const res = await fetch('/api/growth/agent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: stage || undefined,
          fullPipeline: fullPipeline || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }

      // Full pipeline response
      if (fullPipeline && data.stages) {
        const stages = data.stages as Array<{
          stage: string; totalSucceeded: number; totalFailed: number
        }>
        if (stages.length === 0) {
          toast.info('No pending work in any stage')
        } else {
          const summary = stages
            .map(s => `${s.stage}: ${s.totalSucceeded} done`)
            .join(' → ')
          const totalTime = (data.durationMs / 1000).toFixed(1)
          toast.success(
            `Pipeline complete${data.isDryRun ? ' (dry run)' : ''}: ${summary} (${totalTime}s)`
          )
        }
      }
      // Single stage response
      else if (data.stage === 'none') {
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

  const handleContactFirst = async () => {
    if (!cfCity || !cfState || cfTypes.length === 0) {
      toast.error('City, state, and at least one business type are required')
      return
    }
    setCfLoading(true)
    setCfResult(null)
    try {
      const res = await fetch('/api/growth/agent/contact-first', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: cfCity,
          state: cfState,
          businessTypes: cfTypes,
          targetCount: cfTarget,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Contact-first discovery failed')
        return
      }
      setCfResult(data)
      if (data.created > 0) {
        toast.success(`Created ${data.created} prospects with verified emails`)
      } else {
        toast.warning(`Checked ${data.discovered} businesses but found no emails`)
      }
      fetchData() // Refresh activity log
    } catch {
      toast.error('Contact-first discovery failed')
    } finally {
      setCfLoading(false)
    }
  }

  const handleRunDiagnostics = async () => {
    setDiagnosticsLoading(true)
    try {
      const res = await fetch('/api/growth/agent/diagnostics')
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to fetch diagnostics')
        return
      }
      setDiagnosticsData(data)
    } catch {
      toast.error('Failed to fetch diagnostics')
    } finally {
      setDiagnosticsLoading(false)
    }
  }

  const addLocation = () => {
    if (!newCity.trim() || !newState.trim() || !config) return
    updateConfig({
      ...config,
      targetLocations: [...config.targetLocations, { city: newCity.trim(), state: newState.trim() }],
    })
    setNewCity('')
    setNewState('')
  }

  const removeLocation = (index: number) => {
    if (!config) return
    updateConfig({
      ...config,
      targetLocations: config.targetLocations.filter((_, i) => i !== index),
    })
  }

  const toggleBusinessType = (type: string) => {
    if (!config) return
    const types = config.targetBusinessTypes.includes(type)
      ? config.targetBusinessTypes.filter((t) => t !== type)
      : [...config.targetBusinessTypes, type]
    updateConfig({ ...config, targetBusinessTypes: types })
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
                        onClick={() => updateConfig({ ...config, processingMode: mode.value })}
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

                {/* Pipeline Filter (shown when mode is 'filtered') */}
                {config.processingMode === 'filtered' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Label className="font-semibold text-blue-800">Pipeline Filter</Label>
                    <p className="text-xs text-blue-600">
                      Only prospects already in your database that match these criteria will be
                      enriched, emailed, scored, and contacted. This does NOT control discovery.
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
                                updateConfig({
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
                                updateConfig({
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
                                updateConfig({ ...config, filterCriteria: { ...config.filterCriteria, cities: updated } })
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
                              updateConfig({
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
                                updateConfig({ ...config, filterCriteria: { ...config.filterCriteria, tags: updated } })
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
                              updateConfig({
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
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
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
                    {(stats?.queuedCount || 0) > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          if (!confirm(`Clear all ${stats?.queuedCount} prospects from the queue?`)) return
                          try {
                            const res = await fetch('/api/growth/agent/queue', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ clearAll: true }),
                            })
                            const data = await res.json()
                            if (!res.ok) {
                              toast.error(data.error)
                              return
                            }
                            toast.success(data.message)
                            fetchData()
                          } catch {
                            toast.error('Failed to clear queue')
                          }
                        }}
                      >
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Clear Queue
                      </Button>
                    )}
                  </div>
                )}

                {/* Discovery Search Settings */}
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <Label className="font-semibold text-green-800">Discovery Search Settings</Label>
                    <p className="text-xs text-green-600">
                      Where the agent searches for NEW leads on Google Places and Yelp.
                      These settings control what gets added to your prospect database.
                    </p>
                  </div>

                {/* Target Locations */}
                <div className="space-y-2">
                  <Label className="font-semibold">Search Locations</Label>
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

                {/* Business Types for Discovery */}
                <div className="space-y-2">
                  <Label className="font-semibold">Search Business Types</Label>
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
                </div>

                {/* Min Score */}
                <div className="space-y-2">
                  <Label className="font-semibold">
                    Min Score for Outreach: {config.minScoreForOutreach}
                  </Label>
                  <Slider
                    value={[config.minScoreForOutreach]}
                    onValueChange={(values: number[]) => updateConfig({ ...config, minScoreForOutreach: values[0] })}
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
                      onValueChange={(v) => updateConfig({ ...config, outreachTone: v })}
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
                      onValueChange={(v) => updateConfig({ ...config, outreachChannel: v })}
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
                  <Label className="font-semibold">Daily Caps</Label>
                  <p className="text-xs text-gray-500">
                    Max items the agent will process per day across all runs. Once a cap is reached, that stage stops until tomorrow.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Discoveries</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={config.maxDiscoveriesPerDay}
                        onChange={(e) =>
                          updateConfig({ ...config, maxDiscoveriesPerDay: parseInt(e.target.value) || 20 })
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
                          updateConfig({ ...config, maxEmailsPerDay: parseInt(e.target.value) || 10 })
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
                          updateConfig({ ...config, maxOutreachPerDay: parseInt(e.target.value) || 10 })
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
                    onCheckedChange={(v) => updateConfig({ ...config, isDryRun: v })}
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
              <CardDescription>Recent agent runs &mdash; click find_emails rows for diagnostics</CardDescription>
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
                  <ActivityLogRow key={run.id} run={run} />
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
              onClick={() => handleTrigger(undefined, true)}
              disabled={triggerLoading !== null}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {triggerLoading === 'full pipeline' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Full Cycle
            </Button>
            <Button
              variant="outline"
              onClick={handleRunDiagnostics}
              disabled={diagnosticsLoading}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {diagnosticsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Email Diagnostics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact-First Discovery */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="text-green-900">Contact-First Discovery</CardTitle>
          <CardDescription>
            Find businesses that already have verified email data. Only imports prospects with emails &mdash; no dead leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-gray-600">City</Label>
              <Input
                value={cfCity}
                onChange={(e) => setCfCity(e.target.value)}
                placeholder="Austin"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">State</Label>
              <Input
                value={cfState}
                onChange={(e) => setCfState(e.target.value)}
                placeholder="TX"
                maxLength={2}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Target Count</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[cfTarget]}
                  onValueChange={([v]) => setCfTarget(v)}
                  min={5}
                  max={50}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8 text-right">{cfTarget}</span>
              </div>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleContactFirst}
                disabled={cfLoading || !cfCity || !cfState}
                className="bg-green-700 hover:bg-green-800 w-full h-8 text-sm"
              >
                {cfLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {cfLoading ? 'Searching...' : 'Find Prospects'}
              </Button>
            </div>
          </div>

          {/* Business type toggles */}
          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Business Types</Label>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={cfTypes.includes(type)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setCfTypes([...cfTypes, type])
                      } else {
                        setCfTypes(cfTypes.filter((t) => t !== type))
                      }
                    }}
                  />
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Results */}
          {cfResult && (
            <div className="bg-white rounded-lg p-4 border border-green-200 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                <div>
                  <p className="text-xs text-gray-500">Discovered</p>
                  <p className="text-lg font-bold">{cfResult.discovered}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">No Website</p>
                  <p className="text-lg font-bold text-gray-400">{cfResult.skippedNoWebsite}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duplicate</p>
                  <p className="text-lg font-bold text-gray-400">{cfResult.skippedDuplicate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">No Email</p>
                  <p className="text-lg font-bold text-red-600">{cfResult.skippedNoEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-lg font-bold text-green-700">{cfResult.created}</p>
                </div>
              </div>

              {cfResult.prospects?.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto divide-y divide-gray-100 text-xs">
                  {(cfResult.prospects as Array<any>).map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-1.5">
                      <span className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        p.email ? 'bg-green-500' : 'bg-red-400'
                      )} />
                      <span className="font-medium w-40 truncate">{p.name}</span>
                      {p.email ? (
                        <span className="text-green-700">{p.email}</span>
                      ) : (
                        <span className="text-gray-400">no email</span>
                      )}
                      {p.emailSource && (
                        <span className="text-gray-400 ml-auto">via {p.emailSource.replace('_', ' ')}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {cfResult.warnings?.length > 0 && (
                <div className="text-xs text-amber-600 space-y-0.5">
                  {(cfResult.warnings as string[]).map((w: string, i: number) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                {cfResult.created > 0 && (
                  <a
                    href="/growth/prospects"
                    className="text-xs text-green-700 hover:underline font-medium"
                  >
                    View {cfResult.created} new prospects in Prospects list →
                  </a>
                )}
                {cfResult.durationMs && (
                  <p className="text-xs text-gray-400">
                    Completed in {(cfResult.durationMs / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnostics Report */}
      {diagnosticsData && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-amber-900">Email Search Diagnostics</CardTitle>
              <CardDescription>Why prospects failed to find emails</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDiagnosticsData(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hunter API Key check */}
            <div className="flex items-center gap-2 text-sm">
              <span className={cn(
                'w-3 h-3 rounded-full',
                diagnosticsData.hunterApiKeyConfigured ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className="font-medium">Hunter API Key:</span>
              <span>{diagnosticsData.hunterApiKeyConfigured ? 'Configured' : 'NOT SET — this is why 0 emails are found!'}</span>
            </div>

            {/* Summary grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Enriched', value: diagnosticsData.summary.total },
                { label: 'Email Searched', value: diagnosticsData.summary.searched },
                { label: 'Found Emails', value: diagnosticsData.summary.withEmails, color: 'text-green-700' },
                { label: 'No Emails', value: diagnosticsData.summary.withoutEmails, color: 'text-red-700' },
                { label: 'Has Website', value: diagnosticsData.summary.hasWebsite },
                { label: 'Missing Website', value: diagnosticsData.summary.missingWebsite, color: diagnosticsData.summary.missingWebsite > 0 ? 'text-red-700' : '' },
                { label: 'Has City', value: diagnosticsData.summary.hasCity },
                { label: 'Missing City', value: diagnosticsData.summary.missingCity, color: diagnosticsData.summary.missingCity > 0 ? 'text-red-700' : '' },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className={cn('text-lg font-bold', item.color)}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Failure reasons */}
            {Object.keys(diagnosticsData.failReasons).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Failure Breakdown (searched but no email):</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(diagnosticsData.failReasons as Record<string, number>).map(([reason, count]) => (
                    <Badge
                      key={reason}
                      variant="outline"
                      className={cn('text-sm', {
                        'border-red-300 bg-red-50 text-red-700': reason === 'no_domain' || reason === 'not_found',
                        'border-amber-300 bg-amber-50 text-amber-700': reason === 'no_owners_found',
                        'border-orange-300 bg-orange-50 text-orange-700': reason === 'owners_found_but_no_emails',
                      })}
                    >
                      {reason.replace(/_/g, ' ')}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Per-prospect list */}
            <div>
              <p className="text-sm font-medium mb-2">
                Prospect Details ({diagnosticsData.prospects.length}):
              </p>
              <div className="max-h-[300px] overflow-y-auto bg-white rounded-lg divide-y divide-gray-100">
                {(diagnosticsData.prospects as Array<any>).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      p.emailFound ? 'bg-green-500' :
                      !p.searched ? 'bg-gray-300' :
                      'bg-red-500'
                    )} />
                    <span className="font-medium truncate w-40">{p.name}</span>
                    <span className="text-gray-400 truncate w-32">
                      {p.website || '(no website)'}
                    </span>
                    <span className="text-gray-400 w-20">
                      {p.city || '(no city)'}
                    </span>
                    <span className="text-gray-400 w-16">
                      {p.contacts} contacts
                    </span>
                    {p.emailDiagnostics?.failReason && (
                      <span className="text-red-500 ml-auto">
                        {p.emailDiagnostics.failReason.replace(/_/g, ' ')}
                      </span>
                    )}
                    {p.emailFound && (
                      <span className="text-green-600 ml-auto">has email</span>
                    )}
                    {!p.searched && (
                      <span className="text-gray-400 ml-auto">not searched</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
    contact_first: 'bg-emerald-100 text-emerald-700',
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

function ActivityLogRow({ run }: { run: AgentRun }) {
  const [expanded, setExpanded] = useState(false)
  const hasDiagnostics = run.stage === 'find_emails' && run.details?.diagnostics
  const isExpandable = hasDiagnostics || (run.details?.foundEmails?.length > 0)

  // Compute diagnostic summary from details
  const diagSummary = hasDiagnostics ? (() => {
    const diags = run.details.diagnostics as Array<{
      prospect: string
      website: string | null
      domainFound: string | null
      ownersFound: number
      emailsFound: number
      failReason: string | null
    }>
    const reasons: Record<string, number> = {}
    for (const d of diags) {
      const r = d.failReason || 'success'
      reasons[r] = (reasons[r] || 0) + 1
    }
    return { diags, reasons }
  })() : null

  return (
    <div className="rounded-lg bg-gray-50 text-sm">
      <div
        className={cn(
          'flex items-center justify-between py-2 px-3',
          isExpandable && 'cursor-pointer hover:bg-gray-100 rounded-lg'
        )}
        onClick={() => isExpandable && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {isExpandable && (
            expanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />
          )}
          <StageBadge stage={run.stage} />
          <StatusBadge status={run.status} />
          {run.isDryRun && (
            <Badge variant="outline" className="text-xs">dry</Badge>
          )}
          {run.stage === 'find_emails' && run.itemsSucceeded === 0 && run.itemsProcessed > 0 && (
            <AlertTriangle className="h-3 w-3 text-amber-500" />
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

      {expanded && diagSummary && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-200 space-y-2">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(diagSummary.reasons).map(([reason, count]) => (
              <Badge
                key={reason}
                variant="outline"
                className={cn('text-xs', {
                  'border-green-300 text-green-700': reason === 'success',
                  'border-red-300 text-red-700': reason === 'no_domain',
                  'border-amber-300 text-amber-700': reason === 'no_owners_found',
                  'border-orange-300 text-orange-700': reason === 'owners_found_but_no_emails',
                  'border-gray-300 text-gray-600': reason === 'no_city_in_address',
                })}
              >
                {reason.replace(/_/g, ' ')}: {count}
              </Badge>
            ))}
          </div>

          {/* Per-prospect breakdown */}
          <div className="max-h-[200px] overflow-y-auto text-xs space-y-1">
            {diagSummary.diags.map((d, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  d.failReason === null ? 'bg-green-500' :
                  d.failReason === 'no_domain' ? 'bg-red-500' :
                  d.failReason === 'no_owners_found' ? 'bg-amber-500' :
                  'bg-orange-500'
                )} />
                <span className="font-medium truncate max-w-[180px]">{d.prospect}</span>
                <span className="text-gray-400">
                  {d.website ? `→ ${d.domainFound || 'no domain'}` : '(no website)'}
                </span>
                <span className="text-gray-400">
                  {d.ownersFound > 0 ? `${d.ownersFound} owners` : ''}
                </span>
                {d.failReason && (
                  <span className="text-red-500 ml-auto shrink-0">{d.failReason.replace(/_/g, ' ')}</span>
                )}
                {!d.failReason && (
                  <span className="text-green-600 ml-auto shrink-0">email found</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show foundEmails list for older runs without full diagnostics */}
      {expanded && !diagSummary && run.details?.foundEmails?.length > 0 && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-200">
          <div className="max-h-[200px] overflow-y-auto text-xs space-y-1">
            {(run.details.foundEmails as Array<{ prospect: string; email: string | null }>).map((fe, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className={cn('w-2 h-2 rounded-full shrink-0', fe.email ? 'bg-green-500' : 'bg-red-500')} />
                <span className="font-medium truncate max-w-[180px]">{fe.prospect}</span>
                <span className="text-gray-500 ml-auto">{fe.email || 'no email found'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
