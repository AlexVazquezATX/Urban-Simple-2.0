'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ApprovalQueue } from './approval-queue'
import { ActivityFeed } from './activity-feed'
import {
  CheckCircle2,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
  Sparkles,
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
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="p-4">
            <Skeleton className="h-6 w-48 rounded-sm" />
            <Skeleton className="h-4 w-96 mt-2 rounded-sm" />
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!data) {
    return <div className="text-warm-500">Failed to load command center</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-display font-medium text-warm-900">Command Center</h2>
        <p className="text-sm text-warm-500 mt-0.5">
          Your 5-minute morning review dashboard
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-ocean-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Pending Approval</div>
          <div className="text-2xl font-semibold text-ocean-600">{data.approvalQueueCount}</div>
          <p className="text-xs text-warm-500 mt-1">First contacts to review</p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-red-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Hot Prospects</div>
          <div className="text-2xl font-semibold text-red-600">{data.hotProspects.length}</div>
          <p className="text-xs text-warm-500 mt-1">Need immediate attention</p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-plum-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Overnight Activity</div>
          <div className="text-2xl font-semibold text-plum-600">
            {data.overnightActivity.reduce((sum, a) => sum + a.count, 0)}
          </div>
          <p className="text-xs text-warm-500 mt-1">Actions completed by AI</p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-warm-400">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Pipeline Changes</div>
          <div className="text-2xl font-semibold text-warm-900">{data.pipelineMovement.length}</div>
          <p className="text-xs text-warm-500 mt-1">Status updates overnight</p>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="approval" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-none bg-white border-b border-warm-200 p-0 h-auto">
          <TabsTrigger value="approval" className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50">
            <CheckCircle2 className="h-3.5 w-3.5 text-ocean-500" />
            <span>Approval Queue</span>
          </TabsTrigger>
          <TabsTrigger value="hot" className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50">
            <Zap className="h-3.5 w-3.5 text-red-500" />
            <span>Hot Prospects</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50">
            <Clock className="h-3.5 w-3.5 text-plum-500" />
            <span>Overnight Activity</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50">
            <Sparkles className="h-3.5 w-3.5 text-lime-600" />
            <span>AI Insights</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approval" className="mt-4">
          <ApprovalQueue />
        </TabsContent>

        <TabsContent value="hot" className="mt-4">
          <Card className="rounded-sm border-warm-200">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-base font-display font-medium text-warm-900">Hot Prospects</CardTitle>
              <CardDescription className="text-xs text-warm-500">
                Prospects showing high engagement - call them now
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {data.hotProspects.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-10 w-10 mx-auto mb-2 text-warm-300" />
                  <p className="text-sm text-warm-500">No hot prospects right now</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.hotProspects.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Link
                            href={`/growth/prospects/${prospect.id}`}
                            className="text-sm font-medium text-warm-900 hover:text-ocean-600"
                          >
                            {prospect.companyName}
                          </Link>
                          <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200">
                            Hot
                          </Badge>
                          <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">
                            {prospect.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-warm-500">
                          <span>Engagement: {prospect.engagementScore}/100</span>
                          <span>Last: {format(new Date(prospect.lastActivity), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                      <Link href={`/growth/prospects/${prospect.id}`}>
                        <Button size="sm" variant="outline" className="rounded-sm">
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
          <Card className="rounded-sm border-warm-200">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-base font-display font-medium text-warm-900">Overnight Activity</CardTitle>
              <CardDescription className="text-xs text-warm-500">
                What the AI accomplished while you slept
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {data.overnightActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-10 w-10 mx-auto mb-2 text-warm-300" />
                  <p className="text-sm text-warm-500">No overnight activity</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.overnightActivity.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-warm-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-plum-100 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-plum-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-warm-900">{activity.description}</p>
                          <p className="text-xs text-warm-500">{activity.type}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-sm text-xs">{activity.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <Card className="rounded-sm border-warm-200">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-base font-display font-medium text-warm-900">AI Insights</CardTitle>
              <CardDescription className="text-xs text-warm-500">
                Recommendations and performance insights
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {data.aiInsights.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-10 w-10 mx-auto mb-2 text-warm-300" />
                  <p className="text-sm text-warm-500">No insights available yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.aiInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-warm-900 mb-0.5">{insight.title}</h4>
                        <p className="text-xs text-warm-500">{insight.description}</p>
                      </div>
                      {insight.action && (
                        <Button size="sm" variant="outline" className="rounded-sm ml-3">
                          {insight.action}
                          <ArrowRight className="h-3 w-3 ml-1" />
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
