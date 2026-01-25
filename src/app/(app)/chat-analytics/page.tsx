'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  MessageSquare,
  Users,
  TrendingUp,
  Bot,
  Send,
  Loader2,
  Calendar,
  BarChart3,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

interface AnalyticsData {
  period: {
    days: number
    startDate: string
    endDate: string
  }
  overview: {
    totalMessages: number
    userMessages: number
    aiMessages: number
    activeUsers: number
    totalChannels: number
    aiChannels: number
    last24h: {
      messages: number
      users: number
    }
  }
  channelActivity: Array<{
    id: string
    name: string
    type: string
    isAiEnabled: boolean
    aiPersona: string | null
    messageCount: number
    activeUsers: number
    totalMembers: number
  }>
  aiUsage: Array<{
    persona: string | null
    name: string
    questions: number
    responses: number
    uniqueUsers: number
  }>
  dailyActivity: Array<{
    date: string
    messages: number
    users: number
    aiMessages: number
  }>
  topUsers: Array<{
    id: string
    name: string
    role: string
    messageCount: number
  }>
  topChannels: Array<{
    id: string
    name: string
    type: string
    messageCount: number
  }>
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Digest {
  type: string
  period: {
    start: string
    end: string
    days: number
  }
  content: string
  metrics: {
    totalMessages: number
    userMessages: number
    aiMessages: number
    activeUsers: number
    activeChannels: number
  }
  generatedAt: string
}

export default function ChatAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState(7)

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Digest state
  const [digest, setDigest] = useState<Digest | null>(null)
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false)
  const [digestType, setDigestType] = useState<'daily' | 'weekly'>('daily')

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/analytics?days=${days}`, {
        credentials: 'include', // Ensure cookies are sent
      })

      // Get the raw text first
      const text = await response.text()
      console.log('Analytics response text:', text)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error('Failed to parse response as JSON:', text)
        throw new Error('Server returned invalid JSON: ' + text.substring(0, 100))
      }

      if (response.ok) {
        setAnalytics(data)
      } else {
        console.error('Analytics fetch failed:', response.status, data)
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || text
        throw new Error(errorMsg || 'Failed to fetch analytics')
      }
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error)
      toast.error(error.message || 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatting) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setIsChatting(true)

    try {
      const response = await fetch('/api/admin/analytics/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage.content,
          days,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, aiMessage])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      toast.error(error.message || 'Failed to get AI response')
    } finally {
      setIsChatting(false)
    }
  }

  const generateDigest = async () => {
    setIsGeneratingDigest(true)
    try {
      const response = await fetch('/api/admin/analytics/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: digestType,
          days: digestType === 'daily' ? 1 : 7,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setDigest(data.digest)
        toast.success('Digest generated successfully')
      } else {
        throw new Error(data.error || 'Failed to generate digest')
      }
    } catch (error: any) {
      console.error('Digest generation error:', error)
      toast.error(error.message || 'Failed to generate digest')
    } finally {
      setIsGeneratingDigest(false)
    }
  }

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center h-screen bg-warm-50">
        <Loader2 className="h-8 w-8 animate-spin text-warm-400" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-warm-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-warm-900">Chat Analytics</h1>
          <p className="text-sm text-warm-500 mt-0.5">
            Insights powered by <span className="font-medium text-ocean-600">Insight</span>, your AI analytics assistant
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={days === 1 ? "lime" : "outline"}
            onClick={() => setDays(1)}
            size="sm"
            className="rounded-sm text-xs"
          >
            Last 24h
          </Button>
          <Button
            variant={days === 7 ? "lime" : "outline"}
            onClick={() => setDays(7)}
            size="sm"
            className="rounded-sm text-xs"
          >
            7 Days
          </Button>
          <Button
            variant={days === 30 ? "lime" : "outline"}
            onClick={() => setDays(30)}
            size="sm"
            className="rounded-sm text-xs"
          >
            30 Days
          </Button>
          <Button variant="outline" size="icon-sm" onClick={fetchAnalytics} title="Refresh data" className="rounded-sm h-7 w-7">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-ocean-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Total Messages</div>
          <div className="text-2xl font-semibold text-warm-900">{analytics.overview.totalMessages.toLocaleString()}</div>
          <p className="text-xs text-warm-500 mt-1">
            {analytics.overview.userMessages.toLocaleString()} users · {analytics.overview.aiMessages.toLocaleString()} AI
          </p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-lime-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Active Users</div>
          <div className="text-2xl font-semibold text-lime-600">{analytics.overview.activeUsers}</div>
          <p className="text-xs text-warm-500 mt-1">
            {analytics.overview.last24h.users} in last 24h
          </p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-plum-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">AI Interactions</div>
          <div className="text-2xl font-semibold text-plum-600">{analytics.overview.aiMessages.toLocaleString()}</div>
          <p className="text-xs text-warm-500 mt-1">
            {analytics.overview.aiChannels} assistants active
          </p>
        </Card>

        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-warm-400">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Channels</div>
          <div className="text-2xl font-semibold text-warm-900">{analytics.overview.totalChannels}</div>
          <p className="text-xs text-warm-500 mt-1">
            {analytics.topChannels.length} with activity
          </p>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="rounded-sm bg-warm-100 p-1">
          <TabsTrigger value="overview" className="rounded-sm text-sm data-[state=active]:bg-white data-[state=active]:text-warm-900">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-sm text-sm data-[state=active]:bg-white data-[state=active]:text-warm-900">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Ask Insight
          </TabsTrigger>
          <TabsTrigger value="digest" className="rounded-sm text-sm data-[state=active]:bg-white data-[state=active]:text-warm-900">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Digest
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Channels */}
            <Card className="rounded-sm border-warm-200">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-warm-900">
                  <MessageSquare className="h-4 w-4 text-ocean-600" />
                  Top Active Channels
                </CardTitle>
                <CardDescription className="text-xs text-warm-500">Most active channels by message count</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1.5">
                  {analytics.topChannels.slice(0, 5).map((channel, index) => (
                    <div key={channel.id} className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-sm flex items-center justify-center font-semibold text-xs ${
                          index === 0 ? 'bg-lime-100 text-lime-700' :
                          index === 1 ? 'bg-warm-100 text-warm-700' :
                          index === 2 ? 'bg-ocean-100 text-ocean-700' :
                          'bg-warm-100 text-warm-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-sm text-warm-900 block">{channel.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-sm mt-0.5">{channel.type}</Badge>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-warm-500">
                        {channel.messageCount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Assistant Usage */}
            <Card className="rounded-sm border-warm-200">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-warm-900">
                  <Bot className="h-4 w-4 text-plum-600" />
                  AI Assistant Usage
                </CardTitle>
                <CardDescription className="text-xs text-warm-500">Questions asked to each AI assistant</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1.5">
                  {analytics.aiUsage.length > 0 ? (
                    analytics.aiUsage.map((ai, index) => (
                      <div key={index} className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-plum-100 rounded-sm">
                            <Bot className="h-3.5 w-3.5 text-plum-600" />
                          </div>
                          <span className="font-medium text-sm text-warm-900">{ai.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="text-right">
                            <div className="font-semibold text-warm-900">{ai.questions}</div>
                            <div className="text-warm-500">questions</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-warm-900">{ai.uniqueUsers}</div>
                            <div className="text-warm-500">users</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Bot className="h-10 w-10 mx-auto text-warm-300 mb-2" />
                      <p className="text-sm text-warm-500">
                        No AI assistant usage in this period
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Contributors */}
            <Card className="rounded-sm border-warm-200">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-warm-900">
                  <Users className="h-4 w-4 text-lime-600" />
                  Top Contributors
                </CardTitle>
                <CardDescription className="text-xs text-warm-500">Most active team members</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1.5">
                  {analytics.topUsers.map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-sm flex items-center justify-center font-semibold text-xs ${
                          index === 0 ? 'bg-lime-100 text-lime-700' :
                          index === 1 ? 'bg-warm-100 text-warm-700' :
                          index === 2 ? 'bg-ocean-100 text-ocean-700' :
                          'bg-warm-100 text-warm-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-sm text-warm-900 block">{user.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-sm mt-0.5">{user.role}</Badge>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-warm-500">
                        {user.messageCount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Activity */}
            <Card className="rounded-sm border-warm-200">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-warm-900">
                  <TrendingUp className="h-4 w-4 text-ocean-600" />
                  Daily Activity
                </CardTitle>
                <CardDescription className="text-xs text-warm-500">Message activity over time</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1.5">
                  {analytics.dailyActivity.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors">
                      <span className="text-sm font-medium text-warm-900">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <div className="font-semibold text-warm-900">{day.messages}</div>
                          <div className="text-warm-500">msgs</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-warm-900">{day.users}</div>
                          <div className="text-warm-500">users</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ask Insight Tab */}
        <TabsContent value="chat">
          <Card className="h-[600px] flex flex-col rounded-sm border-warm-200">
            <CardHeader className="border-b border-warm-200 bg-warm-50 p-4">
              <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-warm-900">
                <div className="p-1.5 bg-ocean-600 rounded-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                Ask Insight
              </CardTitle>
              <CardDescription className="text-xs text-warm-500">
                Chat with Insight about team communication patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-4 pt-4">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <div className="p-3 bg-ocean-100 rounded-sm mb-3">
                      <Bot className="h-12 w-12 text-ocean-600" />
                    </div>
                    <h3 className="font-display font-medium text-lg text-warm-900 mb-1">Hi! I'm Insight</h3>
                    <p className="text-sm text-warm-500 mb-4 max-w-md">
                      Ask me about your team's chat activity, engagement patterns, or AI assistant usage.
                    </p>
                    <div className="text-left space-y-2 text-sm bg-warm-100 rounded-sm p-3 max-w-md">
                      <p className="font-medium text-warm-900 text-xs uppercase tracking-wide">Try asking:</p>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2 text-warm-700">
                          <MessageSquare className="h-3.5 w-3.5 text-ocean-600 mt-0.5 flex-shrink-0" />
                          <span className="text-xs">"What are the most common questions employees ask?"</span>
                        </li>
                        <li className="flex items-start gap-2 text-warm-700">
                          <TrendingUp className="h-3.5 w-3.5 text-ocean-600 mt-0.5 flex-shrink-0" />
                          <span className="text-xs">"Which channels have the most engagement?"</span>
                        </li>
                        <li className="flex items-start gap-2 text-warm-700">
                          <Bot className="h-3.5 w-3.5 text-ocean-600 mt-0.5 flex-shrink-0" />
                          <span className="text-xs">"How are people using the AI assistants?"</span>
                        </li>
                        <li className="flex items-start gap-2 text-warm-700">
                          <Sparkles className="h-3.5 w-3.5 text-ocean-600 mt-0.5 flex-shrink-0" />
                          <span className="text-xs">"What topics are trending this week?"</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <div className="flex-shrink-0">
                            <div className="p-1.5 bg-ocean-100 rounded-sm">
                              <Bot className="h-4 w-4 text-ocean-600" />
                            </div>
                          </div>
                        )}
                        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                          <div
                            className={`rounded-sm px-3 py-2 ${
                              msg.role === 'user'
                                ? 'bg-ocean-600 text-white'
                                : 'bg-warm-100 border border-warm-200'
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className="text-xs text-warm-400 mt-1 px-1">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>

              <Separator className="bg-warm-200" />

              <div className="p-3 bg-warm-50">
                <div className="flex gap-2">
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Ask Insight about your team's chat activity..."
                    className="min-h-[50px] max-h-[100px] resize-none bg-white rounded-sm border-warm-200 text-sm"
                    disabled={isChatting}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatting}
                    size="icon"
                    className="h-[50px] w-[50px] rounded-sm bg-ocean-600 hover:bg-ocean-700"
                  >
                    {isChatting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Digest Tab */}
        <TabsContent value="digest">
          <Card className="rounded-sm border-warm-200">
            <CardHeader className="border-b border-warm-200 bg-warm-50 p-4">
              <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-warm-900">
                <div className="p-1.5 bg-plum-600 rounded-sm">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                Team Activity Digest
              </CardTitle>
              <CardDescription className="text-xs text-warm-500">
                AI-generated summary of team communication and activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={digestType === 'daily' ? 'lime' : 'outline'}
                  onClick={() => setDigestType('daily')}
                  size="sm"
                  className="rounded-sm"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Daily
                </Button>
                <Button
                  variant={digestType === 'weekly' ? 'lime' : 'outline'}
                  onClick={() => setDigestType('weekly')}
                  size="sm"
                  className="rounded-sm"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  Weekly
                </Button>
                <Button
                  onClick={generateDigest}
                  disabled={isGeneratingDigest}
                  variant="lime"
                  size="sm"
                  className="ml-auto rounded-sm"
                >
                  {isGeneratingDigest ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Generate Digest
                    </>
                  )}
                </Button>
              </div>

              {digest && (
                <div className="space-y-4">
                  <div className="bg-warm-50 rounded-sm p-4 border border-warm-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display font-medium text-warm-900">
                          {digest.type.charAt(0).toUpperCase() + digest.type.slice(1)} Digest
                        </h3>
                        <p className="text-xs text-warm-500 mt-0.5">
                          {new Date(digest.period.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} -{' '}
                          {new Date(digest.period.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-center">
                          <div className="text-xl font-semibold text-plum-600">{digest.metrics.totalMessages.toLocaleString()}</div>
                          <div className="text-xs text-warm-500">Messages</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-semibold text-ocean-600">{digest.metrics.activeUsers}</div>
                          <div className="text-xs text-warm-500">Users</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-semibold text-lime-600">{digest.metrics.activeChannels}</div>
                          <div className="text-xs text-warm-500">Channels</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-warm-200" />

                  <div className="bg-white rounded-sm p-4 border border-warm-200">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-warm-700">{digest.content}</div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-warm-400">
                    <span className="flex items-center gap-1">
                      <Bot className="h-3 w-3" />
                      Generated by Insight AI
                    </span>
                    <span>
                      {new Date(digest.generatedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              )}

              {!digest && !isGeneratingDigest && (
                <div className="text-center py-12">
                  <div className="p-3 bg-plum-100 rounded-sm inline-block mb-3">
                    <Calendar className="h-10 w-10 text-plum-600" />
                  </div>
                  <h3 className="font-display font-medium text-warm-900 mb-1">No Digest Generated Yet</h3>
                  <p className="text-sm text-warm-500">
                    Click "Generate Digest" to create a summary of team activity
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
