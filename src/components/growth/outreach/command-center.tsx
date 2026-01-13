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
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!data) {
    return <div>Failed to load command center</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Command Center</h2>
        <p className="text-muted-foreground mt-1">
          Your 5-minute morning review dashboard
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.approvalQueueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              First contacts to review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hot Prospects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.hotProspects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overnight Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overnightActivity.reduce((sum, a) => sum + a.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Actions completed by AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pipelineMovement.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Status updates overnight
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="approval" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="approval" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approval Queue
            {data.approvalQueueCount > 0 && (
              <Badge variant="secondary">{data.approvalQueueCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="hot" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Hot Prospects
            {data.hotProspects.length > 0 && (
              <Badge variant="destructive">{data.hotProspects.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Overnight Activity
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approval" className="mt-6">
          <ApprovalQueue />
        </TabsContent>

        <TabsContent value="hot" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hot Prospects</CardTitle>
              <CardDescription>
                Prospects showing high engagement - call them now
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.hotProspects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hot prospects right now</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.hotProspects.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/growth/prospects/${prospect.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {prospect.companyName}
                          </Link>
                          <Badge variant="destructive" className="text-xs">
                            Hot
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {prospect.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Engagement: {prospect.engagementScore}/100
                          </span>
                          <span>
                            Last activity: {format(new Date(prospect.lastActivity), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/growth/prospects/${prospect.id}`}>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Overnight Activity</CardTitle>
              <CardDescription>
                What the AI accomplished while you slept
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.overnightActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No overnight activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.overnightActivity.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.type}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{activity.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Insights</CardTitle>
              <CardDescription>
                Recommendations and performance insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.aiInsights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No insights available yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.aiInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {insight.description}
                          </p>
                        </div>
                        {insight.action && (
                          <Button size="sm" variant="outline">
                            {insight.action}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
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

