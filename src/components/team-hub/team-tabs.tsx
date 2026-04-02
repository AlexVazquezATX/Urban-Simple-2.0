'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TeamListClient } from '@/components/team/team-list-client'
import { Users, Calendar, UserCheck, MessageSquare, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

export function TeamTabs({ users, branches, stats }: TeamTabsProps) {
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
      <TabsList className="bg-warm-100 dark:bg-charcoal-800 border border-warm-200 dark:border-charcoal-700">
        <TabsTrigger value="roster" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">
          <Users className="h-3.5 w-3.5" />
          Roster
        </TabsTrigger>
        <TabsTrigger value="operations" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">
          <Calendar className="h-3.5 w-3.5" />
          Operations
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roster" className="mt-0">
        {/* Team Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6">
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardContent className="p-3">
              <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-semibold text-warm-900 dark:text-cream-100">{stats.totalMembers}</p>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardContent className="p-3">
              <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-semibold text-lime-600 dark:text-lime-400">{stats.activeMembers}</p>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardContent className="p-3">
              <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wide">Associates</p>
              <p className="text-2xl font-semibold text-warm-900 dark:text-cream-100">{stats.associates}</p>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardContent className="p-3">
              <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wide">Managers</p>
              <p className="text-2xl font-semibold text-warm-900 dark:text-cream-100">{stats.managers}</p>
            </CardContent>
          </Card>
        </div>

        <TeamListClient initialUsers={users} branches={branches} />
      </TabsContent>

      <TabsContent value="operations" className="mt-0">
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/operations/schedule">
            <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 hover:border-ocean-400 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-sm bg-ocean-50 dark:bg-ocean-950 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-ocean-600 dark:text-ocean-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium text-warm-900 dark:text-cream-100">Schedule</CardTitle>
                    <CardDescription className="text-warm-500 dark:text-cream-400">Weekly shift calendar</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Open Schedule <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/operations/assignments">
            <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 hover:border-ocean-400 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-sm bg-lime-50 dark:bg-lime-950 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-lime-600 dark:text-lime-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium text-warm-900 dark:text-cream-100">Assignments</CardTitle>
                    <CardDescription className="text-warm-500 dark:text-cream-400">Location staff assignments</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Manage <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/chat">
            <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 hover:border-ocean-400 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-sm bg-warm-100 dark:bg-charcoal-800 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-warm-600 dark:text-cream-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium text-warm-900 dark:text-cream-100">Team Chat</CardTitle>
                    <CardDescription className="text-warm-500 dark:text-cream-400">Channels and messages</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Open Chat <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </TabsContent>
    </Tabs>
  )
}
