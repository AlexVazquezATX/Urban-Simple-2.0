'use client'

import { Fragment, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ClipboardCheck,
  MapPin,
  Clock,
  Building2,
  Navigation,
  Loader2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Moon,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { useManagerLang } from '@/lib/i18n/use-manager-lang'

interface TonightLocation {
  id: string
  shiftId: string
  locationId: string
  locationName: string
  clientName: string
  address: string
  scheduledTime: string
  checklistName: string
  status: 'pending' | 'in_progress' | 'completed'
  reviewId?: string
  serviceLogId?: string | null
  associateName?: string
  managerId?: string | null
  managerName?: string
  associateStatus?: 'not_started' | 'on_site' | 'clocked_out' | 'submitted'
  checklistDone?: number | null
  checklistTotal?: number | null
  notDoneCount?: number
  incompleteIssueId?: string | null
}

export default function NightlyReviewsPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<TonightLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [seeAll, setSeeAll] = useState(false)
  const { t } = useManagerLang()
  const rv = t.reviews
  // The route API fills gaps with English placeholders; show them in the
  // viewer's language.
  const placeholder = (value: string | undefined, fallback: string) =>
    !value || value === fallback ? null : value

  useEffect(() => {
    fetchTonightLocations()
  }, [])

  const fetchTonightLocations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/operations/tonight-route', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const rows: TonightLocation[] = data.locations ?? []
        const all = data.scope === 'all'
        setSeeAll(all)
        // Admins get every route; keep each manager's stops together.
        setLocations(
          all
            ? [...rows].sort((a, b) =>
                (a.managerName || '').localeCompare(b.managerName || '')
              )
            : rows
        )
      } else {
        throw new Error("Failed to fetch tonight's locations")
      }
    } catch (error: unknown) {
      console.error('Fetch error:', error)
      toast.error(error instanceof Error ? error.message : rv.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLocations = locations.filter((loc) => {
    if (filter === 'all') return true
    if (filter === 'pending') return loc.status !== 'completed'
    return loc.status === 'completed'
  })

  const completedCount = locations.filter((l) => l.status === 'completed').length
  const pendingCount = locations.length - completedCount
  const completionPct =
    locations.length === 0 ? 0 : Math.round((completedCount / locations.length) * 100)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-300" />
      case 'in_progress':
        return <AlertCircle className="h-5 w-5 text-teal-600 dark:text-teal-300" />
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="green">{t.shiftStatus.completed}</Badge>
      case 'in_progress':
        return <Badge variant="teal">{rv.inProgress}</Badge>
      default:
        return <Badge variant="neutral">{rv.pendingBadge}</Badge>
    }
  }

  const handleStartReview = (location: TonightLocation) => {
    router.push(`/operations/nightly-reviews/${location.id}`)
  }

  const handleGetDirections = (address: string) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    window.open(mapsUrl, '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const emptyCopy =
    filter === 'completed'
      ? { title: rv.emptyCompletedTitle, description: rv.emptyCompletedBody }
      : filter === 'pending'
        ? { title: rv.emptyPendingTitle, description: rv.emptyPendingBody }
        : { title: rv.emptyAllTitle, description: rv.emptyAllBody }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={rv.kicker}
        title={rv.title}
        subtitle={seeAll ? rv.subtitleAll : rv.subtitleMine}
        actions={<LanguageToggle />}
        className="mb-0"
      />

      {/* Progress KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={rv.stops}
          value={locations.length}
          icon={Building2}
          sub={rv.scheduledForService}
        />
        <StatCard
          label={rv.completed}
          value={completedCount}
          icon={CheckCircle2}
          tone={locations.length > 0 && completedCount === locations.length ? 'green' : 'neutral'}
          sub={
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gold-600 transition-all duration-300 dark:bg-gold-400"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="font-mono tabular-nums">{completionPct}%</span>
            </div>
          }
        />
        <StatCard
          label={rv.pending}
          value={pendingCount}
          icon={Clock}
          tone={pendingCount > 0 ? 'gold' : 'neutral'}
          sub={pendingCount > 0 ? rv.stillNeedReview : rv.allReviewed}
        />
      </div>

      {/* Status filter tabs */}
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as 'all' | 'pending' | 'completed')}
      >
        <TabsList>
          <TabsTrigger value="all">
            {rv.all}
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {locations.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pending">
            {rv.pending}
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {pendingCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="completed">
            {rv.completed}
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {completedCount}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Review queue */}
      <div className="space-y-3">
        {filteredLocations.length === 0 ? (
          <Card className="py-2">
            <CardContent className="px-4">
              <EmptyState
                icon={Moon}
                title={emptyCopy.title}
                description={emptyCopy.description}
              />
            </CardContent>
          </Card>
        ) : (
          filteredLocations.map((location, index) => (
            <Fragment key={location.id}>
              {seeAll &&
                (index === 0 ||
                  filteredLocations[index - 1].managerId !== location.managerId) && (
                  <p className="kicker pt-2 text-muted-foreground">
                    {placeholder(location.managerName, 'Manager') ?? t.common.manager}
                  </p>
                )}
              <Card
                className="gap-0 py-0 transition-colors hover:border-gold-600/30 dark:hover:border-gold-400/25"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(location.status)}
                    </div>

                    {/* Location Info */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-display text-[15px] font-semibold tracking-[-0.2px] text-foreground">
                            {location.locationName}
                          </h3>
                          <p className="text-xs text-muted-foreground">{location.clientName}</p>
                        </div>
                        {getStatusBadge(location.status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate text-xs">{location.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-mono text-xs tabular-nums">
                            {location.scheduledTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                          <ClipboardCheck className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-xs">
                            {placeholder(location.checklistName, 'No checklist assigned') ??
                              t.common.noChecklist}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-muted-foreground sm:col-span-2">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-xs text-foreground">
                            {placeholder(location.associateName, 'Unassigned') ?? t.common.unassigned}
                          </span>
                          {location.associateStatus && (
                            <span className="text-xs">
                              · {t.stopStatus[location.associateStatus]}
                            </span>
                          )}
                          {location.checklistTotal != null && location.checklistTotal > 0 && (
                            <span className="font-mono text-xs tabular-nums">
                              {rv.done(location.checklistDone ?? 0, location.checklistTotal)}
                            </span>
                          )}
                          {(location.notDoneCount ?? 0) > 0 && (
                            <Badge variant="coral">{t.common.notDone(location.notDoneCount ?? 0)}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {location.status === 'completed' ? (
                          <Button
                            onClick={() => handleStartReview(location)}
                            variant="ghost"
                            className="flex-1 sm:flex-none"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {rv.viewReview}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleStartReview(location)}
                            variant="gold"
                            className="flex-1 sm:flex-none"
                          >
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            {location.status === 'in_progress' ? rv.continueReview : rv.startReview}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => handleGetDirections(location.address)}
                          className="flex-1 sm:flex-none"
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          {rv.directions}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Fragment>
          ))
        )}
      </div>
    </div>
  )
}
