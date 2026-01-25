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
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-sm border-warm-200">
              <CardHeader className="p-4 pb-2">
                <Skeleton className="h-4 w-24 rounded-sm" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Skeleton className="h-8 w-16 rounded-sm" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-warm-500">Failed to load dashboard data</div>
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3.5 w-3.5 text-ocean-500" />
      case 'sms':
        return <MessageSquare className="h-3.5 w-3.5 text-lime-600" />
      case 'linkedin':
        return <Linkedin className="h-3.5 w-3.5 text-ocean-600" />
      case 'instagram':
      case 'instagram_dm':
        return <Instagram className="h-3.5 w-3.5 text-plum-500" />
      default:
        return <Send className="h-3.5 w-3.5 text-warm-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Command Center */}
      <CommandCenter />

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-ocean-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Messages This Week</div>
          <div className="text-2xl font-semibold text-ocean-600">{data.stats.messagesThisWeek}</div>
          <p className="text-xs text-warm-500 mt-1">Across all channels</p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-lime-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Response Rate</div>
          <div className="text-2xl font-semibold text-lime-600">{data.stats.responseRate}%</div>
          <p className="text-xs text-warm-500 mt-1">{data.stats.responsesThisWeek} responses this week</p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-plum-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Scheduled Today</div>
          <div className="text-2xl font-semibold text-plum-600">{data.stats.scheduledToday}</div>
          <p className="text-xs text-warm-500 mt-1">Messages to send</p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-red-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Hot Prospects</div>
          <div className="text-2xl font-semibold text-red-600">{data.stats.hotProspects}</div>
          <p className="text-xs text-warm-500 mt-1">Showing engagement</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Tasks */}
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-base font-display font-medium text-warm-900">Today's Tasks</CardTitle>
            <CardDescription className="text-xs text-warm-500">
              Follow-ups and scheduled messages for today
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <TaskList tasks={data.todaysTasks} scheduledMessages={data.scheduledMessages} />
          </CardContent>
        </Card>

        {/* Hot Prospects */}
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-base font-display font-medium text-warm-900">Hot Prospects</CardTitle>
            <CardDescription className="text-xs text-warm-500">
              Prospects showing recent engagement
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
                  <Link
                    key={prospect.id}
                    href={`/growth/prospects/${prospect.id}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-warm-900">{prospect.companyName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">
                          {prospect.status}
                        </Badge>
                        <span className="text-[10px] text-warm-400">
                          {format(new Date(prospect.lastActivity), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <Zap className="h-4 w-4 text-red-500 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base font-display font-medium text-warm-900">Recent Activity</CardTitle>
          <CardDescription className="text-xs text-warm-500">
            Latest outreach activities across all prospects
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ActivityFeed activities={data.recentActivity} />
        </CardContent>
      </Card>
    </div>
  )
}
