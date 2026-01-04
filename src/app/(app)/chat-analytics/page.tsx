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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chat Analytics</h1>
          <p className="text-muted-foreground">
            Insights powered by Insight, your AI analytics assistant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDays(1)}>
            Last 24h
          </Button>
          <Button variant="outline" onClick={() => setDays(7)}>
            7 Days
          </Button>
          <Button variant="outline" onClick={() => setDays(30)}>
            30 Days
          </Button>
          <Button variant="outline" size="icon" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.userMessages} from users, {analytics.overview.aiMessages} from AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.last24h.users} in last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Interactions</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.aiMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.aiChannels} AI assistants active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Channels</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalChannels}</div>
            <p className="text-xs text-muted-foreground">
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
            <Card>
              <CardHeader>
                <CardTitle>Top Active Channels</CardTitle>
                <CardDescription>Most active channels by message count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topChannels.slice(0, 5).map((channel, index) => (
                    <div key={channel.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{channel.name}</span>
                        <Badge variant="secondary" className="text-xs">{channel.type}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {channel.messageCount} messages
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Assistant Usage */}
            <Card>
              <CardHeader>
                <CardTitle>AI Assistant Usage</CardTitle>
                <CardDescription>Questions asked to each AI assistant</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.aiUsage.length > 0 ? (
                    analytics.aiUsage.map((ai, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-ocean-600" />
                          <span className="font-medium">{ai.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{ai.questions} questions</span>
                          <span>{ai.uniqueUsers} users</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No AI assistant usage in this period
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Contributors */}
            <Card>
              <CardHeader>
                <CardTitle>Top Contributors</CardTitle>
                <CardDescription>Most active team members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topUsers.map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{user.name}</span>
                        <Badge variant="secondary" className="text-xs">{user.role}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {user.messageCount} messages
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
                <CardDescription>Message activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.dailyActivity.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <div className="flex items-center gap-3">
                        <span>{day.messages} msgs</span>
                        <span className="text-muted-foreground">{day.users} users</span>
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
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-ocean-600" />
                Ask Insight
              </CardTitle>
              <CardDescription>
                Chat with Insight, your AI analytics assistant, about team communication patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <Bot className="h-16 w-16 text-ocean-600 mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Hi! I'm Insight</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ask me anything about your team's chat activity, engagement patterns, or AI assistant usage.
                    </p>
                    <div className="text-left space-y-2 text-sm text-muted-foreground">
                      <p>Try asking:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>"What are the most common questions employees ask?"</li>
                        <li>"Which channels have the most engagement?"</li>
                        <li>"How are people using the AI assistants?"</li>
                        <li>"What topics are trending this week?"</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                          <div
                            className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
                              msg.role === 'user'
                                ? 'bg-ocean-600 text-white'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>

              <Separator className="my-4" />

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
                  className="min-h-[60px] max-h-[120px] resize-none"
                  disabled={isChatting}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isChatting}
                  size="icon"
                  className="h-[60px] w-[60px]"
                >
                  {isChatting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Digest Tab */}
        <TabsContent value="digest">
          <Card>
            <CardHeader>
              <CardTitle>Team Activity Digest</CardTitle>
              <CardDescription>
                AI-generated summary of team communication and activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={digestType === 'daily' ? 'default' : 'outline'}
                  onClick={() => setDigestType('daily')}
                >
                  Daily Digest
                </Button>
                <Button
                  variant={digestType === 'weekly' ? 'default' : 'outline'}
                  onClick={() => setDigestType('weekly')}
                >
                  Weekly Digest
                </Button>
                <Button
                  onClick={generateDigest}
                  disabled={isGeneratingDigest}
                  className="ml-auto"
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
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {digest.type.charAt(0).toUpperCase() + digest.type.slice(1)} Digest
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(digest.period.start).toLocaleDateString()} -{' '}
                        {new Date(digest.period.end).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold">{digest.metrics.totalMessages}</div>
                        <div className="text-muted-foreground">Messages</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{digest.metrics.activeUsers}</div>
                        <div className="text-muted-foreground">Users</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{digest.metrics.activeChannels}</div>
                        <div className="text-muted-foreground">Channels</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap">{digest.content}</div>
                  </div>

                  <div className="text-xs text-muted-foreground text-right">
                    Generated {new Date(digest.generatedAt).toLocaleString()}
                  </div>
                </div>
              )}

              {!digest && !isGeneratingDigest && (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Generate Digest" to create a summary of team activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
