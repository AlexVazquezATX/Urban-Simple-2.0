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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Growth</h1>
          <p className="text-muted-foreground">
            Manage your sales pipeline and prospect outreach
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/growth/prospects">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              View All Leads
            </Button>
          </Link>
          <Link href="/growth/prospects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Prospect
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-bronze-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Prospects</CardTitle>
            <div className="rounded-full bg-bronze-500/10 p-2">
              <Users className="h-5 w-5 text-bronze-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {Object.values(statsMap).reduce((a, b) => a + b, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All prospects in system</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-ocean-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New in Pipeline</CardTitle>
            <div className="rounded-full bg-ocean-500/10 p-2">
              <Target className="h-5 w-5 text-ocean-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{statsMap.new || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for outreach</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{statsMap.qualified || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">High-value leads</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contact Today</CardTitle>
            <div className="rounded-full bg-accent/10 p-2">
              <Zap className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{prospectsToContact.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Action required</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prospects to Contact */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Priority Outreach</CardTitle>
                <CardDescription>Prospects that need contact today</CardDescription>
              </div>
              <Badge variant="outline">{prospectsToContact.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {prospectsToContact.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No prospects need contact today</p>
                <Link href="/growth/prospects">
                  <Button variant="outline" size="sm" className="mt-4">
                    View All Prospects
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {prospectsToContact.map((prospect) => (
                  <div
                    key={prospect.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <Link href={`/growth/prospects/${prospect.id}`}>
                        <h4 className="text-sm font-medium hover:text-primary truncate">
                          {prospect.companyName}
                        </h4>
                      </Link>
                      {prospect.contacts.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {prospect.contacts[0].firstName} {prospect.contacts[0].lastName}
                          {prospect.contacts[0].title && ` • ${prospect.contacts[0].title}`}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          prospect.priority === 'urgent' ? 'bg-muted text-destructive' :
                          prospect.priority === 'high' ? 'bg-muted text-accent' :
                          prospect.priority === 'medium' ? 'bg-muted text-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {prospect.priority}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {prospect.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {prospect.contacts[0]?.email && (
                        <Link href={`/growth/outreach?prospect=${prospect.id}&channel=email`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      {prospect.contacts[0]?.phone && (
                        <Link href={`/growth/outreach?prospect=${prospect.id}&channel=phone`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Phone className="h-4 w-4" />
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>Activities scheduled for today</CardDescription>
              </div>
              <Badge variant="outline">{scheduledActivities.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {scheduledActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No activities scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium uppercase">
                          {activity.type}
                        </span>
                        {activity.channel && (
                          <span className="text-[10px] text-muted-foreground">
                            via {activity.channel}
                          </span>
                        )}
                      </div>
                      <Link href={`/growth/prospects/${activity.prospect.id}`}>
                        <h4 className="text-sm font-medium hover:text-primary truncate">
                          {activity.prospect.companyName}
                        </h4>
                      </Link>
                      {activity.title && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {activity.title}
                        </p>
                      )}
                      {activity.scheduledAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
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
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div>
          <h3 className="font-semibold">More Tools</h3>
          <p className="text-sm text-muted-foreground">Access pipeline and discovery features</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/growth/pipeline">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Pipeline
            </Button>
          </Link>
          <Link href="/growth/discovery">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              AI Discovery
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function GrowthPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          {/* Stats skeletons */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          {/* Content skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
          {/* Quick actions skeleton */}
          <Skeleton className="h-20 w-full" />
        </div>
      }
    >
      <DailyPlannerContent />
    </Suspense>
  )
}

