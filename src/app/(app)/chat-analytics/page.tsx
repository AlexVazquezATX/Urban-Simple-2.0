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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Insights powered by <span className="font-medium text-ocean-600">Insight</span>, your AI analytics assistant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={days === 1 ? "default" : "outline"}
            onClick={() => setDays(1)}
            className="text-sm"
          >
            Last 24h
          </Button>
          <Button
            variant={days === 7 ? "default" : "outline"}
            onClick={() => setDays(7)}
            className="text-sm"
          >
            7 Days
          </Button>
          <Button
            variant={days === 30 ? "default" : "outline"}
            onClick={() => setDays(30)}
            className="text-sm"
          >
            30 Days
          </Button>
          <Button variant="outline" size="icon" onClick={fetchAnalytics} title="Refresh data">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <div className="p-2 bg-ocean-100 rounded-lg">
              <MessageSquare className="h-4 w-4 text-ocean-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.overview.userMessages.toLocaleString()} from users, {analytics.overview.aiMessages.toLocaleString()} from AI
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.overview.last24h.users} in last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Interactions</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bot className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.aiMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.overview.aiChannels} AI assistants active
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Channels</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalChannels}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.topChannels.length} with activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="chat">
            <Sparkles className="h-4 w-4 mr-2" />
            Ask Insight
          </TabsTrigger>
          <TabsTrigger value="digest">
            <Calendar className="h-4 w-4 mr-2" />
            Digest
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Channels */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-ocean-600" />
                  Top Active Channels
                </CardTitle>
                <CardDescription>Most active channels by message count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topChannels.slice(0, 5).map((channel, index) => (
                    <div key={channel.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium block">{channel.name}</span>
                          <Badge variant="secondary" className="text-xs mt-1">{channel.type}</Badge>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {channel.messageCount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Assistant Usage */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  AI Assistant Usage
                </CardTitle>
                <CardDescription>Questions asked to each AI assistant</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.aiUsage.length > 0 ? (
                    analytics.aiUsage.map((ai, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-full">
                            <Bot className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="font-medium">{ai.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <div className="font-semibold">{ai.questions}</div>
                            <div className="text-xs text-muted-foreground">questions</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{ai.uniqueUsers}</div>
                            <div className="text-xs text-muted-foreground">users</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No AI assistant usage in this period
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Contributors */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Top Contributors
                </CardTitle>
                <CardDescription>Most active team members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topUsers.map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium block">{user.name}</span>
                          <Badge variant="secondary" className="text-xs mt-1">{user.role}</Badge>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {user.messageCount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Activity */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Daily Activity
                </CardTitle>
                <CardDescription>Message activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.dailyActivity.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <div className="font-semibold">{day.messages}</div>
                          <div className="text-xs text-muted-foreground">msgs</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{day.users}</div>
                          <div className="text-xs text-muted-foreground">users</div>
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
          <Card className="h-[700px] flex flex-col shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-ocean-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-ocean-600 rounded-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                Ask Insight
              </CardTitle>
              <CardDescription>
                Chat with Insight, your AI analytics assistant, about team communication patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-6 pt-4">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="p-4 bg-gradient-to-br from-ocean-100 to-blue-100 rounded-full mb-4">
                      <Bot className="h-16 w-16 text-ocean-600" />
                    </div>
                    <h3 className="font-semibold text-xl mb-2">Hi! I'm Insight</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md">
                      Ask me anything about your team's chat activity, engagement patterns, or AI assistant usage.
                    </p>
                    <div className="text-left space-y-3 text-sm bg-muted/50 rounded-lg p-4 max-w-md">
                      <p className="font-medium">Try asking:</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-ocean-600 mt-0.5 flex-shrink-0" />
                          <span>"What are the most common questions employees ask?"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-ocean-600 mt-0.5 flex-shrink-0" />
                          <span>"Which channels have the most engagement?"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Bot className="h-4 w-4 text-ocean-600 mt-0.5 flex-shrink-0" />
                          <span>"How are people using the AI assistants?"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-ocean-600 mt-0.5 flex-shrink-0" />
                          <span>"What topics are trending this week?"</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pb-4">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <div className="flex-shrink-0">
                            <div className="p-2 bg-ocean-100 rounded-full">
                              <Bot className="h-5 w-5 text-ocean-600" />
                            </div>
                          </div>
                        )}
                        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                          <div
                            className={`rounded-2xl px-4 py-3 shadow-sm ${
                              msg.role === 'user'
                                ? 'bg-ocean-600 text-white'
                                : 'bg-muted border'
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 px-2">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>

              <Separator />

              <div className="p-4 bg-muted/20">
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
                    className="min-h-[60px] max-h-[120px] resize-none bg-background"
                    disabled={isChatting}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatting}
                    size="icon"
                    className="h-[60px] w-[60px] bg-ocean-600 hover:bg-ocean-700"
                  >
                    {isChatting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Digest Tab */}
        <TabsContent value="digest">
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                Team Activity Digest
              </CardTitle>
              <CardDescription>
                AI-generated summary of team communication and activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant={digestType === 'daily' ? 'default' : 'outline'}
                  onClick={() => setDigestType('daily')}
                  className={digestType === 'daily' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Daily Digest
                </Button>
                <Button
                  variant={digestType === 'weekly' ? 'default' : 'outline'}
                  onClick={() => setDigestType('weekly')}
                  className={digestType === 'weekly' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Weekly Digest
                </Button>
                <Button
                  onClick={generateDigest}
                  disabled={isGeneratingDigest}
                  className="ml-auto bg-purple-600 hover:bg-purple-700"
                >
                  {isGeneratingDigest ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Digest
                    </>
                  )}
                </Button>
              </div>

              {digest && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {digest.type.charAt(0).toUpperCase() + digest.type.slice(1)} Digest
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(digest.period.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} -{' '}
                          {new Date(digest.period.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{digest.metrics.totalMessages.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground mt-1">Messages</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{digest.metrics.activeUsers}</div>
                          <div className="text-xs text-muted-foreground mt-1">Users</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{digest.metrics.activeChannels}</div>
                          <div className="text-xs text-muted-foreground mt-1">Channels</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-muted/30 rounded-lg p-6">
                    <div className="prose prose-sm max-w-none">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{digest.content}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                <div className="text-center py-16">
                  <div className="p-4 bg-purple-100 rounded-full inline-block mb-4">
                    <Calendar className="h-12 w-12 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No Digest Generated Yet</h3>
                  <p className="text-muted-foreground">
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
