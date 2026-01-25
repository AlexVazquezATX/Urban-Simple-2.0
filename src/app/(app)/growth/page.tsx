import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Phone, Mail, Calendar, TrendingUp, Target, Sparkles, Users, Zap, ArrowRight, CheckCircle2, Clock, Rocket, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function DailyPlannerContent() {
  const user = await getCurrentUser()
  if (!user) {
    return <div>Please log in</div>
  }

  // Get today's tasks and priorities
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get prospects that need contact today
  const prospectsToContact = await prisma.prospect.findMany({
    where: {
      companyId: user.companyId,
      status: {
        in: ['new', 'researching', 'contacted', 'engaged', 'qualified'],
      },
      OR: [
        { lastContactedAt: null },
        { lastContactedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Not contacted in 7 days
      ],
    },
    include: {
      contacts: {
        take: 1,
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    take: 10,
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  // Get scheduled activities for today
  const scheduledActivities = await prisma.prospectActivity.findMany({
    where: {
      prospect: {
        companyId: user.companyId,
      },
      scheduledAt: {
        gte: today,
        lt: tomorrow,
      },
      completedAt: null,
    },
    include: {
      prospect: {
        select: {
          id: true,
          companyName: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  })

  // Get pipeline stats
  const pipelineStats = await prisma.prospect.groupBy({
    by: ['status'],
    where: {
      companyId: user.companyId,
    },
    _count: {
      id: true,
    },
  })

  const statsMap = pipelineStats.reduce((acc, stat) => {
    acc[stat.status] = stat._count.id
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-warm-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-warm-900">Daily Planner</h1>
          <p className="text-sm text-warm-500 mt-0.5">
            Manage your sales pipeline and prospect outreach
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/growth/prospects">
            <Button variant="outline" size="sm" className="rounded-sm">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              View All Leads
            </Button>
          </Link>
          <Link href="/growth/prospects/new">
            <Button variant="lime" size="sm" className="rounded-sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Prospect
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-warm-400">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Total Prospects</div>
          <div className="text-2xl font-semibold text-warm-900">
            {Object.values(statsMap).reduce((a, b) => a + b, 0)}
          </div>
          <p className="text-xs text-warm-500 mt-1">All prospects in system</p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-ocean-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">New in Pipeline</div>
          <div className="text-2xl font-semibold text-ocean-600">{statsMap.new || 0}</div>
          <p className="text-xs text-warm-500 mt-1">Ready for outreach</p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-lime-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Qualified</div>
          <div className="text-2xl font-semibold text-lime-600">{statsMap.qualified || 0}</div>
          <p className="text-xs text-warm-500 mt-1">High-value leads</p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-plum-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Contact Today</div>
          <div className="text-2xl font-semibold text-plum-600">{prospectsToContact.length}</div>
          <p className="text-xs text-warm-500 mt-1">Action required</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Prospects to Contact */}
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900">Priority Outreach</CardTitle>
                <CardDescription className="text-xs text-warm-500">Prospects that need contact today</CardDescription>
              </div>
              <Badge variant="secondary" className="rounded-sm text-xs">{prospectsToContact.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {prospectsToContact.length === 0 ? (
              <div className="text-center py-8">
                <Target className="mx-auto h-10 w-10 mb-2 text-warm-300" />
                <p className="text-sm text-warm-500">No prospects need contact today</p>
                <Link href="/growth/prospects">
                  <Button variant="outline" size="sm" className="mt-4 rounded-sm">
                    View All Prospects
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {prospectsToContact.map((prospect) => (
                  <div
                    key={prospect.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <Link href={`/growth/prospects/${prospect.id}`}>
                        <h4 className="text-sm font-medium text-warm-900 hover:text-ocean-600 truncate">
                          {prospect.companyName}
                        </h4>
                      </Link>
                      {prospect.contacts.length > 0 && (
                        <p className="text-xs text-warm-500 mt-0.5">
                          {prospect.contacts[0].firstName} {prospect.contacts[0].lastName}
                          {prospect.contacts[0].title && ` • ${prospect.contacts[0].title}`}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-1.5 py-0 rounded-sm font-medium ${
                          prospect.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          prospect.priority === 'high' ? 'bg-plum-100 text-plum-700' :
                          prospect.priority === 'medium' ? 'bg-warm-100 text-warm-700' :
                          'bg-warm-100 text-warm-500'
                        }`}>
                          {prospect.priority}
                        </span>
                        <span className="text-[10px] text-warm-400 capitalize">
                          {prospect.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {prospect.contacts[0]?.email && (
                        <Link href={`/growth/outreach?prospect=${prospect.id}&channel=email`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-warm-500 hover:text-ocean-600">
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                      {prospect.contacts[0]?.phone && (
                        <Link href={`/growth/outreach?prospect=${prospect.id}&channel=phone`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-warm-500 hover:text-ocean-600">
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Activities */}
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900">Today's Schedule</CardTitle>
                <CardDescription className="text-xs text-warm-500">Activities scheduled for today</CardDescription>
              </div>
              <Badge variant="secondary" className="rounded-sm text-xs">{scheduledActivities.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {scheduledActivities.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-10 w-10 mb-2 text-warm-300" />
                <p className="text-sm text-warm-500">No activities scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {scheduledActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] px-1.5 py-0 rounded-sm bg-warm-100 text-warm-700 font-medium uppercase">
                          {activity.type}
                        </span>
                        {activity.channel && (
                          <span className="text-[10px] text-warm-400">
                            via {activity.channel}
                          </span>
                        )}
                      </div>
                      <Link href={`/growth/prospects/${activity.prospect.id}`}>
                        <h4 className="text-sm font-medium text-warm-900 hover:text-ocean-600 truncate">
                          {activity.prospect.companyName}
                        </h4>
                      </Link>
                      {activity.title && (
                        <p className="text-xs text-warm-500 mt-0.5 truncate">
                          {activity.title}
                        </p>
                      )}
                      {activity.scheduledAt && (
                        <p className="text-xs text-warm-400 mt-0.5">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(activity.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {activity.user && ` • ${activity.user.firstName} ${activity.user.lastName}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="rounded-sm border-warm-200 mt-4">
        <div className="flex items-center justify-between p-4">
          <div>
            <h3 className="font-display font-medium text-warm-900">More Tools</h3>
            <p className="text-sm text-warm-500">Access pipeline and discovery features</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/growth/pipeline">
              <Button variant="outline" size="sm" className="rounded-sm">
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                Pipeline
              </Button>
            </Link>
            <Link href="/growth/discovery">
              <Button variant="lime" size="sm" className="rounded-sm">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI Discovery
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function GrowthPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 max-w-7xl mx-auto bg-warm-50 min-h-screen">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-7 w-40 rounded-sm" />
              <Skeleton className="h-4 w-64 mt-2 rounded-sm" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded-sm" />
              <Skeleton className="h-8 w-28 rounded-sm" />
            </div>
          </div>
          {/* Stats skeletons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-sm" />
            ))}
          </div>
          {/* Content skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-80 rounded-sm" />
            ))}
          </div>
          {/* Quick actions skeleton */}
          <Skeleton className="h-16 w-full mt-4 rounded-sm" />
        </div>
      }
    >
      <DailyPlannerContent />
    </Suspense>
  )
}

