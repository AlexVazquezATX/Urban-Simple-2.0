'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OutreachDashboard } from '@/components/growth/outreach/outreach-dashboard'
import { QuickCompose } from '@/components/growth/outreach/quick-compose'
import { TemplateLibrary } from '@/components/growth/outreach/template-library'
import { SequenceList } from '@/components/growth/outreach/sequence-list'
import { BulkSender } from '@/components/growth/outreach/bulk-sender'
import { OutreachSettings } from '@/components/growth/outreach/outreach-settings'
import { LayoutDashboard, Send, FileText, Zap, Users, Settings } from 'lucide-react'

export default function OutreachPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'dashboard')

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Outreach Hub</h1>
        <p className="text-muted-foreground mt-1">
          Your command center for lead generation and outreach
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="sequences" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Sequences
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <OutreachDashboard />
        </TabsContent>

        <TabsContent value="compose" className="mt-6">
          <QuickCompose />
        </TabsContent>

        <TabsContent value="sequences" className="mt-6">
          <SequenceList />
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          <BulkSender />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateLibrary />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <OutreachSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
