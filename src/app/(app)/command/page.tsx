import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader } from '@/components/ui/card'
import { LiveOpsView } from '@/components/command/live-ops-view'
import { NeedsAttentionQueue } from '@/components/command/needs-attention-queue'
import { BusinessPulseStrip } from '@/components/command/business-pulse-strip'
import { MorningBriefing } from '@/components/command/morning-briefing'
import { MyNightView } from '@/components/command/my-night-view'

async function CommandCenterData() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  // Fetch KPI data + briefing
  const briefingDate = new Date()
  briefingDate.setUTCHours(0, 0, 0, 0)

  const [clients, invoices, prospects, briefing, topicsCount] = await Promise.all([
    prisma.client.findMany({
      where: {
        companyId: user.companyId,
        ...(user.branchId && { branchId: user.branchId }),
      },
      select: { id: true },
    }),
    prisma.invoice.findMany({
      where: {
        client: {
          companyId: user.companyId,
          ...(user.branchId && { branchId: user.branchId }),
        },
      },
      select: { id: true, status: true, balanceDue: true, dueDate: true, totalAmount: true, issueDate: true },
    }),
    prisma.prospect.findMany({
      where: {
        companyId: user.companyId,
        status: { notIn: ['won', 'lost'] },
      },
      select: { estimatedValue: true },
    }),
    prisma.pulseBriefing.findUnique({
      where: {
        userId_date: { userId: user.id, date: briefingDate },
      },
      include: {
        items: {
          include: { topic: { select: { id: true, name: true, category: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.pulseTopic.count({
      where: { userId: user.id, isActive: true },
    }),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const outstandingInvoices = invoices.filter(inv =>
    ['draft', 'sent', 'partial'].includes(inv.status) && Number(inv.balanceDue) > 0
  )

  const arTotal = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0)

  const overdueCount = outstandingInvoices.filter(inv => {
    const dueDate = new Date(inv.dueDate)
    return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) > 0
  }).length

  const thisMonth = today.getMonth()
  const thisYear = today.getFullYear()
  const thisMonthRevenue = invoices
    .filter((inv) => {
      const issueDate = new Date(inv.issueDate)
      return issueDate.getMonth() === thisMonth && issueDate.getFullYear() === thisYear
    })
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)

  const pipelineValue = prospects.reduce((sum, p) => sum + Number(p.estimatedValue || 0), 0)

  // Serialize briefing for client component
  const serializedBriefing = briefing ? {
    id: briefing.id,
    summary: briefing.summary,
    items: briefing.items.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      category: item.category,
      topic: item.topic,
    })),
  } : null

  return (
    <div className="space-y-6">
      {/* AI Morning Briefing */}
      {user.role === 'SUPER_ADMIN' && (
        <MorningBriefing
          briefing={serializedBriefing}
          topicsCount={topicsCount}
          userName={user.firstName}
        />
      )}

      {/* Zone 3: Business Pulse Strip */}
      <BusinessPulseStrip
        totalClients={clients.length}
        arOutstanding={arTotal}
        thisMonthRevenue={thisMonthRevenue}
        overdueCount={overdueCount}
        pipelineValue={pipelineValue}
      />

      {/* Zone 1 + Zone 2: Live Ops + Needs Attention */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveOpsView />
        </div>
        <div>
          <NeedsAttentionQueue />
        </div>
      </div>
    </div>
  )
}

function CommandCenterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="rounded-sm">
            <CardHeader>
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-64 rounded-sm" />
        </div>
        <Skeleton className="h-64 rounded-sm" />
      </div>
    </div>
  )
}

export default async function CommandCenterPage() {
  const user = await getCurrentUser()

  // Associates get the simplified "My Night" view
  if (user?.role === 'ASSOCIATE') {
    return <MyNightView userName={user.firstName} />
  }

  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-medium tracking-tight font-display text-warm-900 dark:text-cream-100">
          {greeting}, {user?.firstName}
        </h1>
        <p className="text-warm-500 dark:text-cream-400">
          Here&apos;s what&apos;s happening with your business today
        </p>
      </div>

      <Suspense fallback={<CommandCenterSkeleton />}>
        <CommandCenterData />
      </Suspense>
    </div>
  )
}
