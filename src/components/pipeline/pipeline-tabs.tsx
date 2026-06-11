'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Kanban, Mail, Search } from 'lucide-react'
import { ProspectsListClient } from '@/components/growth/prospects-list-client'
import { PipelineBoard } from '@/components/growth/pipeline-board'
import { DiscoverySearch } from '@/components/growth/discovery-search'
import { MessagesHub } from '@/components/growth/outreach/messages-hub'
import { QuickCompose } from '@/components/growth/outreach/quick-compose'
import { TemplateLibrary } from '@/components/growth/outreach/template-library'
import { SequenceList } from '@/components/growth/outreach/sequence-list'

interface PipelineTabsProps {
  prospects: any[]
  pipelineProspects: any[]
}

export function PipelineTabs({ prospects, pipelineProspects }: PipelineTabsProps) {
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

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="prospects">
          <Users className="size-3.5" />
          Prospects
        </TabsTrigger>
        <TabsTrigger value="board">
          <Kanban className="size-3.5" />
          Board
        </TabsTrigger>
        <TabsTrigger value="outreach">
          <Mail className="size-3.5" />
          Outreach
        </TabsTrigger>
        <TabsTrigger value="discovery">
          <Search className="size-3.5" />
          Discovery
        </TabsTrigger>
      </TabsList>

      <TabsContent value="prospects" className="mt-0">
        <ProspectsListClient prospects={prospects} />
      </TabsContent>

      <TabsContent value="board" className="mt-0">
        <PipelineBoard initialProspects={pipelineProspects} />
      </TabsContent>

      <TabsContent value="outreach" className="mt-0">
        <Suspense fallback={<Skeleton className="h-96 rounded-[14px]" />}>
          <OutreachEmbed />
        </Suspense>
      </TabsContent>

      <TabsContent value="discovery" className="mt-0">
        <DiscoverySearch />
      </TabsContent>
    </Tabs>
  )
}

function OutreachEmbed() {
  const [outreachTab, setOutreachTab] = useState('messages')

  return (
    <div className="space-y-4">
      <Tabs value={outreachTab} onValueChange={setOutreachTab}>
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="messages"><MessagesHub /></TabsContent>
        <TabsContent value="compose"><QuickCompose /></TabsContent>
        <TabsContent value="sequences"><SequenceList /></TabsContent>
        <TabsContent value="templates"><TemplateLibrary /></TabsContent>
      </Tabs>
    </div>
  )
}
