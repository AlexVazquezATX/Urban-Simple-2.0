'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ActivityFeed } from './activity-feed'
import { TaskList } from './task-list'
import { CommandCenter } from './command-center'
import {
  Send,
  TrendingUp,
  Calendar,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface DashboardData {
  stats: {
    messagesThisWeek: number
    responsesThisWeek: number
    responseRate: number
    scheduledToday: number
    hotProspects: number
  }
  todaysTasks: any[]
  recentActivity: any[]
  scheduledMessages: any[]
  hotProspects: any[]
}

export function OutreachDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/growth/outreach/dashboard')
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-muted-foreground">Failed to load dashboard data</div>
  }

  return (
    <div className="space-y-6">
      {/* Command Center */}
      <CommandCenter />

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Messages This Week"
          value={data.stats.messagesThisWeek}
          sub="Across all channels"
          icon={Send}
        />
        <StatCard
          label="Response Rate"
          value={`${data.stats.responseRate}%`}
          sub={`${data.stats.responsesThisWeek} responses this week`}
          icon={TrendingUp}
        />
        <StatCard
          label="Scheduled Today"
          value={data.stats.scheduledToday}
          sub="Messages to send"
          icon={Calendar}
        />
        <StatCard
          label="Hot Prospects"
          value={data.stats.hotProspects}
          sub="Showing engagement"
          icon={Zap}
          tone={data.stats.hotProspects > 0 ? 'gold' : 'neutral'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Tasks</CardTitle>
            <CardDescription>
              Follow-ups and scheduled messages for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskList tasks={data.todaysTasks} scheduledMessages={data.scheduledMessages} />
          </CardContent>
        </Card>

        {/* Hot Prospects */}
        <Card>
          <CardHeader>
            <CardTitle>Hot Prospects</CardTitle>
            <CardDescription>
              Prospects showing recent engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.hotProspects.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="No hot prospects right now"
                description="Prospects who open, click, or reply will light up here."
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {data.hotProspects.map((prospect) => (
                  <Link
                    key={prospect.id}
                    href={`/growth/prospects/${prospect.id}`}
                    className="flex items-center justify-between rounded-[12px] border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{prospect.companyName}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge variant="neutral">{prospect.status}</Badge>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {format(new Date(prospect.lastActivity), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <Zap className="size-4 shrink-0 text-gold-600 dark:text-gold-400" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest outreach activities across all prospects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={data.recentActivity} />
        </CardContent>
      </Card>
    </div>
  )
}
