'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ActivityFeed } from './activity-feed'
import { TaskList } from './task-list'
import { CommandCenter } from './command-center'
import {
  Send,
  TrendingUp,
  Calendar,
  Zap,
  Mail,
  MessageSquare,
  Linkedin,
  Instagram,
  Clock,
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
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
    return <div>Failed to load dashboard data</div>
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <MessageSquare className="h-4 w-4" />
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />
      case 'instagram':
      case 'instagram_dm':
        return <Instagram className="h-4 w-4" />
      default:
        return <Send className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Command Center */}
      <CommandCenter />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages This Week</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.messagesThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all channels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.responseRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.stats.responsesThisWeek} responses this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.scheduledToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Messages to send
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hot Prospects</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.hotProspects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Showing engagement
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
              <p className="text-sm text-muted-foreground text-center py-4">
                No hot prospects right now
              </p>
            ) : (
              <div className="space-y-3">
                {data.hotProspects.map((prospect) => (
                  <Link
                    key={prospect.id}
                    href={`/growth/prospects/${prospect.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{prospect.companyName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {prospect.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(prospect.lastActivity), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <Zap className="h-4 w-4 text-amber-500" />
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
