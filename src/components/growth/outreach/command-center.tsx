'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ApprovalQueue } from './approval-queue'
import {
  CheckCircle2,
  Zap,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface CommandCenterData {
  approvalQueueCount: number
  hotProspects: Array<{
    id: string
    companyName: string
    status: string
    lastActivity: string
    engagementScore: number
  }>
  overnightActivity: Array<{
    type: string
    count: number
    description: string
  }>
  pipelineMovement: Array<{
    prospectId: string
    prospectName: string
    fromStatus: string
    toStatus: string
    movedAt: string
  }>
  aiInsights: Array<{
    type: string
    title: string
    description: string
    action?: string
  }>
}

export function CommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCommandCenterData()
  }, [])

  const fetchCommandCenterData = async () => {
    try {
      const response = await fetch('/api/growth/outreach/command-center')
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching command center:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-96" />
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!data) {
    return <div className="text-muted-foreground">Failed to load command center</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="font-display text-lg font-bold tracking-[-0.2px] text-foreground">Command Center</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your 5-minute morning review dashboard
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Pending Approval"
          value={data.approvalQueueCount}
          sub="First contacts to review"
          icon={CheckCircle2}
        />
        <StatCard
          label="Hot Prospects"
          value={data.hotProspects.length}
          sub="Need immediate attention"
          icon={Zap}
          tone={data.hotProspects.length > 0 ? 'gold' : 'neutral'}
        />
        <StatCard
          label="Overnight Activity"
          value={data.overnightActivity.reduce((sum, a) => sum + a.count, 0)}
          sub="Actions completed by AI"
          icon={Sparkles}
        />
        <StatCard
          label="Pipeline Changes"
          value={data.pipelineMovement.length}
          sub="Status updates overnight"
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="approval" className="w-full">
        <TabsList className="w-full justify-start gap-5 overflow-x-auto">
          <TabsTrigger value="approval">Approval Queue</TabsTrigger>
          <TabsTrigger value="hot">Hot Prospects</TabsTrigger>
          <TabsTrigger value="activity">Overnight Activity</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="approval" className="mt-4">
          <ApprovalQueue />
        </TabsContent>

        <TabsContent value="hot" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Hot Prospects</CardTitle>
              <CardDescription>
                Prospects showing high engagement - call them now
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.hotProspects.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="No hot prospects right now"
                  description="When a prospect starts engaging heavily, they'll surface here so you can strike while it's warm."
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {data.hotProspects.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="flex items-center justify-between rounded-[12px] border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <Link
                            href={`/growth/prospects/${prospect.id}`}
                            className="text-sm font-medium text-foreground hover:text-primary"
                          >
                            {prospect.companyName}
                          </Link>
                          <Badge variant="gold">Hot</Badge>
                          <Badge variant="neutral">{prospect.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-xs tabular-nums text-muted-foreground">
                          <span>Engagement: {prospect.engagementScore}/100</span>
                          <span>Last: {format(new Date(prospect.lastActivity), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                      <Link href={`/growth/prospects/${prospect.id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Overnight Activity</CardTitle>
              <CardDescription>
                What the AI accomplished while you slept
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.overnightActivity.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="A quiet night"
                  description="The AI didn't have anything queued overnight. New automated activity will be summarized here."
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {data.overnightActivity.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-[12px] border border-border bg-card px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid size-8 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
                          <Sparkles className="size-4 text-gold-600 dark:text-gold-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">{activity.type}</p>
                        </div>
                      </div>
                      <Badge variant="default" className="font-mono tabular-nums">{activity.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Insights</CardTitle>
              <CardDescription>
                Recommendations and performance insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.aiInsights.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No insights yet"
                  description="Once there's enough outreach data, the AI will surface recommendations here."
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {data.aiInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-[12px] border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="mb-0.5 text-sm font-medium text-foreground">{insight.title}</h4>
                        <p className="text-xs text-muted-foreground">{insight.description}</p>
                      </div>
                      {insight.action && (
                        <Button size="sm" variant="outline" className="ml-3">
                          {insight.action}
                          <ArrowRight className="size-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
