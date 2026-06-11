import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Phone, Mail, Calendar, Target, Sparkles, Users, Clock, Rocket, BarChart3, Building2 } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

function priorityTone(priority: string): 'coral' | 'gold' | 'neutral' {
  if (priority === 'urgent') return 'coral'
  if (priority === 'high') return 'gold'
  return 'neutral'
}

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
      deletedAt: null,
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
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <PageHeader
        kicker="GROWTH · DAILY PLANNER"
        title="Daily Planner"
        subtitle="Manage your sales pipeline and prospect outreach"
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/growth/prospects">
                <Users className="size-4" />
                View All Leads
              </Link>
            </Button>
            <Button asChild variant="gold" size="sm">
              <Link href="/growth/prospects/new">
                <Plus className="size-4" />
                Add Prospect
              </Link>
            </Button>
          </>
        }
      />

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total prospects"
          value={Object.values(statsMap).reduce((a, b) => a + b, 0)}
          sub="All prospects in system"
          icon={Users}
        />
        <StatCard
          label="New in pipeline"
          value={statsMap.new || 0}
          sub="Ready for outreach"
          icon={Rocket}
        />
        <StatCard
          label="Qualified"
          value={statsMap.qualified || 0}
          sub="High-value leads"
          icon={Target}
        />
        <StatCard
          label="Contact today"
          value={prospectsToContact.length}
          sub="Action required"
          icon={Clock}
          tone={prospectsToContact.length > 0 ? 'coral' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_380px]">
        {/* Prospects to Contact */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Priority Outreach</CardTitle>
                <CardDescription className="mt-0.5 text-xs">Prospects that need contact today</CardDescription>
              </div>
              <Badge variant={prospectsToContact.length > 0 ? 'coral' : 'neutral'}>
                {prospectsToContact.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {prospectsToContact.length === 0 ? (
              <EmptyState
                icon={Target}
                title="All caught up — no one needs a nudge today"
                description="Prospects show up here when they go a week without contact."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/growth/prospects">View All Prospects</Link>
                  </Button>
                }
              />
            ) : (
              <div>
                {prospectsToContact.map((prospect) => {
                  const tone = priorityTone(prospect.priority)
                  return (
                    <div
                      key={prospect.id}
                      className="flex items-center gap-3 border-b border-border/60 py-3 first:pt-0 last:border-0 last:pb-0"
                    >
                      <div
                        className={`grid size-[30px] shrink-0 place-items-center rounded-[9px] ${
                          tone === 'coral'
                            ? 'bg-coral-600/10 dark:bg-coral-300/12'
                            : tone === 'gold'
                              ? 'bg-gold-600/10 dark:bg-gold-400/12'
                              : 'bg-secondary'
                        }`}
                      >
                        <Building2
                          className={`size-[14px] ${
                            tone === 'coral'
                              ? 'text-coral-600 dark:text-coral-300'
                              : tone === 'gold'
                                ? 'text-gold-600 dark:text-gold-400'
                                : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/growth/prospects/${prospect.id}`}>
                          <h4 className="truncate text-[13px] font-semibold text-foreground transition-colors hover:text-primary">
                            {prospect.companyName}
                          </h4>
                        </Link>
                        {prospect.contacts.length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {prospect.contacts[0].firstName} {prospect.contacts[0].lastName}
                            {prospect.contacts[0].title && ` · ${prospect.contacts[0].title}`}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Badge variant={tone}>{prospect.priority}</Badge>
                          <span className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
                            {prospect.status}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 flex items-center gap-1">
                        {prospect.contacts[0]?.email && (
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link href={`/growth/outreach?prospect=${prospect.id}&channel=email`}>
                              <Mail className="size-4" />
                            </Link>
                          </Button>
                        )}
                        {prospect.contacts[0]?.phone && (
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link href={`/growth/outreach?prospect=${prospect.id}&channel=phone`}>
                              <Phone className="size-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Activities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Today&apos;s Schedule</CardTitle>
                <CardDescription className="mt-0.5 text-xs">Activities scheduled for today</CardDescription>
              </div>
              <Badge variant="neutral">{scheduledActivities.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {scheduledActivities.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Nothing on the books today"
                description="Schedule a follow-up from any prospect and it will show up here."
              />
            ) : (
              <div>
                {scheduledActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 border-b border-border/60 py-3 first:pt-0 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="neutral" className="uppercase">{activity.type}</Badge>
                        {activity.channel && (
                          <span className="text-[11px] text-muted-foreground">
                            via {activity.channel}
                          </span>
                        )}
                      </div>
                      <Link href={`/growth/prospects/${activity.prospect.id}`}>
                        <h4 className="truncate text-[13px] font-semibold text-foreground transition-colors hover:text-primary">
                          {activity.prospect.companyName}
                        </h4>
                      </Link>
                      {activity.title && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {activity.title}
                        </p>
                      )}
                      {activity.scheduledAt && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3 text-gold-600 dark:text-gold-400" />
                          <span className="font-mono tabular-nums text-gold-600 dark:text-gold-400">
                            {new Date(activity.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {activity.user && ` · ${activity.user.firstName} ${activity.user.lastName}`}
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
      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-[15px] font-bold tracking-[-0.2px] text-foreground">More Tools</h3>
            <p className="text-sm text-muted-foreground">Access pipeline and discovery features</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/growth/pipeline">
                <BarChart3 className="size-4" />
                Pipeline
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/growth/discovery">
                <Sparkles className="size-4" />
                AI Discovery
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function GrowthPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl p-4 md:p-6">
          {/* Header skeleton */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <Skeleton className="h-3.5 w-44 rounded-md" />
              <Skeleton className="mt-3 h-8 w-48 rounded-md" />
              <Skeleton className="mt-2 h-4 w-72 rounded-md" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded-[9px]" />
              <Skeleton className="h-8 w-28 rounded-[9px]" />
            </div>
          </div>
          {/* Stats skeletons */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[110px] rounded-[14px]" />
            ))}
          </div>
          {/* Content skeletons */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-80 rounded-[14px]" />
            ))}
          </div>
          {/* Quick actions skeleton */}
          <Skeleton className="mt-4 h-20 w-full rounded-[14px]" />
        </div>
      }
    >
      <DailyPlannerContent />
    </Suspense>
  )
}
