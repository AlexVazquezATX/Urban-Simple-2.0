'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { MessagesHub } from '@/components/growth/outreach/messages-hub'
import { QuickCompose } from '@/components/growth/outreach/quick-compose'
import { TemplateLibrary } from '@/components/growth/outreach/template-library'
import { SequenceList } from '@/components/growth/outreach/sequence-list'
import { OutreachSettings } from '@/components/growth/outreach/outreach-settings'
import { OutreachAnalytics } from '@/components/growth/outreach/outreach-analytics'
import { Inbox, Send, FileText, Zap, Settings, BarChart3 } from 'lucide-react'

export default function OutreachPage() {
  return (
    <Suspense>
      <OutreachContent />
    </Suspense>
  )
}

function OutreachContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const prospectParam = searchParams.get('prospect')
  // Auto-switch to compose tab when prospect param is present (e.g. from "Send Email" button)
  const defaultTab = tabParam || (prospectParam ? 'compose' : 'messages')
  const [activeTab, setActiveTab] = useState(defaultTab)

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    } else if (prospectParam) {
      setActiveTab('compose')
    }
  }, [tabParam, prospectParam])

  return (
    <div>
      <PageHeader
        kicker="GROWTH · OUTREACH"
        title="Outreach Hub"
        subtitle="Review, send, and track your outreach messages"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 w-full justify-start gap-5 overflow-x-auto">
          <TabsTrigger value="messages">
            <Inbox className="size-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="compose">
            <Send className="size-4" />
            <span className="hidden sm:inline">Compose</span>
          </TabsTrigger>
          <TabsTrigger value="sequences">
            <Zap className="size-4" />
            <span className="hidden sm:inline">Sequences</span>
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="size-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="size-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="size-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-0">
          <MessagesHub />
        </TabsContent>

        <TabsContent value="compose" className="mt-0">
          <QuickCompose />
        </TabsContent>

        <TabsContent value="sequences" className="mt-0">
          <SequenceList />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <TemplateLibrary />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <OutreachAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <OutreachSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
