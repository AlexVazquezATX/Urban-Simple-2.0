'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Kanban, Mail, Search, Bot } from 'lucide-react'
import { ProspectsListClient } from '@/components/growth/prospects-list-client'
import { PipelineBoard } from '@/components/growth/pipeline-board'
import { DiscoverySearch } from '@/components/growth/discovery-search'
import { GrowthAgentDashboard } from '@/components/growth/agent/growth-agent-dashboard'
import { MessagesHub } from '@/components/growth/outreach/messages-hub'
import { QuickCompose } from '@/components/growth/outreach/quick-compose'
import { TemplateLibrary } from '@/components/growth/outreach/template-library'
import { SequenceList } from '@/components/growth/outreach/sequence-list'

interface PipelineTabsProps {
  prospects: any[]
  pipelineProspects: any[]
  userRole: string
}

export function PipelineTabs({ prospects, pipelineProspects, userRole }: PipelineTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab') || 'prospects'
  const [activeTab, setActiveTab] = useState(tabParam)

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam)
  }, [tabParam])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/pipeline?tab=${value}`, { scroll: false })
  }

  const isSuperAdmin = userRole === 'SUPER_ADMIN'

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsList className="bg-warm-100 dark:bg-charcoal-800 border border-warm-200 dark:border-charcoal-700">
        <TabsTrigger value="prospects" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">
          <Users className="h-3.5 w-3.5" />
          Prospects
        </TabsTrigger>
        <TabsTrigger value="board" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">
          <Kanban className="h-3.5 w-3.5" />
          Board
        </TabsTrigger>
        <TabsTrigger value="outreach" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">
          <Mail className="h-3.5 w-3.5" />
          Outreach
        </TabsTrigger>
        <TabsTrigger value="discovery" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">
          <Search className="h-3.5 w-3.5" />
          Discovery
        </TabsTrigger>
        {isSuperAdmin && (
          <TabsTrigger value="agent" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">
            <Bot className="h-3.5 w-3.5" />
            Agent
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="prospects" className="mt-0">
        <ProspectsListClient prospects={prospects} />
      </TabsContent>

      <TabsContent value="board" className="mt-0">
        <PipelineBoard initialProspects={pipelineProspects} />
      </TabsContent>

      <TabsContent value="outreach" className="mt-0">
        <Suspense fallback={<Skeleton className="h-96 rounded-sm" />}>
          <OutreachEmbed />
        </Suspense>
      </TabsContent>

      <TabsContent value="discovery" className="mt-0">
        <DiscoverySearch />
      </TabsContent>

      {isSuperAdmin && (
        <TabsContent value="agent" className="mt-0">
          <GrowthAgentDashboard />
        </TabsContent>
      )}
    </Tabs>
  )
}

function OutreachEmbed() {
  const [outreachTab, setOutreachTab] = useState('messages')

  return (
    <div className="space-y-4">
      <Tabs value={outreachTab} onValueChange={setOutreachTab}>
        <TabsList className="bg-warm-50 dark:bg-charcoal-800 border border-warm-200 dark:border-charcoal-700">
          <TabsTrigger value="messages" className="text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">Messages</TabsTrigger>
          <TabsTrigger value="compose" className="text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">Compose</TabsTrigger>
          <TabsTrigger value="sequences" className="text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">Sequences</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="messages"><MessagesHub /></TabsContent>
        <TabsContent value="compose"><QuickCompose /></TabsContent>
        <TabsContent value="sequences"><SequenceList /></TabsContent>
        <TabsContent value="templates"><TemplateLibrary /></TabsContent>
      </Tabs>
    </div>
  )
}
