'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TeamListClient } from '@/components/team/team-list-client'
import { Users, Calendar, UserCheck, MessageSquare, ArrowRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface TeamTabsProps {
  users: any[]
  branches: any[]
  stats: {
    totalMembers: number
    activeMembers: number
    associates: number
    managers: number
  }
}

// Operations nav-card — soft gold icon tile + display title + 13px sub;
// the whole card is the link (no CTA buttons inside).
function OpsNavCard({
  href,
  icon: Icon,
  title,
  sub,
}: {
  href: string
  icon: LucideIcon
  title: string
  sub: string
}) {
  return (
    <Link
      href={href}
      className="group flex h-full items-center gap-3.5 rounded-[14px] border border-border bg-card p-[18px] shadow-soft transition-colors hover:border-primary/40 dark:shadow-none"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
        <Icon className="size-[18px] text-gold-600 dark:text-gold-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[15px] font-bold tracking-[-0.2px] text-foreground">
          {title}
        </div>
        <div className="text-[13px] text-muted-foreground">{sub}</div>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  )
}

export function TeamTabs({ users, branches }: TeamTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab') || 'roster'
  const [activeTab, setActiveTab] = useState(tabParam)

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam)
  }, [tabParam])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/team-hub?tab=${value}`, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="roster" className="gap-1.5">
          <Users className="size-3.5" />
          Roster
        </TabsTrigger>
        <TabsTrigger value="operations" className="gap-1.5">
          <Calendar className="size-3.5" />
          Operations
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roster" className="mt-0">
        {/* TeamListClient brings its own page header + KPI row, so the
            duplicate stat grid that used to live here is gone. */}
        <TeamListClient initialUsers={users} branches={branches} />
      </TabsContent>

      <TabsContent value="operations" className="mt-0">
        <div className="grid gap-4 md:grid-cols-3">
          <OpsNavCard
            href="/operations/schedule"
            icon={Calendar}
            title="Schedule"
            sub="Weekly shift calendar"
          />
          <OpsNavCard
            href="/operations/assignments"
            icon={UserCheck}
            title="Assignments"
            sub="Location staff assignments"
          />
          <OpsNavCard
            href="/chat"
            icon={MessageSquare}
            title="Team Chat"
            sub="Channels and messages"
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
