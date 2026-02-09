'use client'

import { useState, useEffect, Suspense } from 'react'
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
  return (
    <Suspense>
      <OutreachContent />
    </Suspense>
  )
}

function OutreachContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'dashboard')

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-warm-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-warm-900">Outreach Hub</h1>
          <p className="text-sm text-warm-500 mt-0.5">
            Your command center for lead generation and outreach
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 rounded-none bg-white border-b border-warm-200 p-0 mb-6 h-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs py-3 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50">
            <LayoutDashboard className="h-3.5 w-3.5 text-ocean-500" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center gap-1.5 text-xs py-3 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50">
            <Send className="h-3.5 w-3.5 text-lime-600" />
            <span className="hidden sm:inline">Compose</span>
          </TabsTrigger>
          <TabsTrigger value="sequences" className="flex items-center gap-1.5 text-xs py-3 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50">
            <Zap className="h-3.5 w-3.5 text-plum-500" />
            <span className="hidden sm:inline">Sequences</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-1.5 text-xs py-3 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50">
            <Users className="h-3.5 w-3.5 text-ocean-500" />
            <span className="hidden sm:inline">Bulk</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs py-3 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50">
            <FileText className="h-3.5 w-3.5 text-warm-600" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs py-3 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50">
            <Settings className="h-3.5 w-3.5 text-warm-500" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <OutreachDashboard />
        </TabsContent>

        <TabsContent value="compose" className="mt-0">
          <QuickCompose />
        </TabsContent>

        <TabsContent value="sequences" className="mt-0">
          <SequenceList />
        </TabsContent>

        <TabsContent value="bulk" className="mt-0">
          <BulkSender />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <TemplateLibrary />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <OutreachSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
