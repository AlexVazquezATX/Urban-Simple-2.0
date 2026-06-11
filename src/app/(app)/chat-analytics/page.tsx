'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
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
  Hash,
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

/** Segmented control — bordered inline-flex, active segment bg-secondary + semibold. */
function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-stretch overflow-hidden rounded-[9px] border border-border', className)}>
      {options.map((option, index) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 py-1.5 text-xs transition-colors',
            index < options.length - 1 && 'border-r border-border',
            value === option.value
              ? 'bg-secondary font-semibold text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Ranked bar-row — name + mono value + mono meta right, 6px gold-filled track below. */
function BarRow({
  rank,
  name,
  chip,
  value,
  meta,
  pct,
}: {
  rank?: number
  name: string
  chip?: React.ReactNode
  value: string
  meta?: string
  pct: number
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border/60 py-2.5 last:border-0 last:pb-0">
      <div className="flex items-center gap-2.5">
        {rank !== undefined && (
          <span className="w-4 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
            {rank}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-foreground">{name}</span>
        {chip}
        <span className="font-mono text-xs tabular-nums text-foreground">{value}</span>
        {meta && (
          <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
            {meta}
          </span>
        )}
      </div>
      <div className={cn('h-1.5 overflow-hidden rounded-[3px] bg-secondary', rank !== undefined && 'ml-[26px]')}>
        <div
          className="h-full rounded-[3px] bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  )
}

function roleTone(role: string): 'gold' | 'teal' | 'neutral' {
  const r = role.toUpperCase()
  if (r.includes('ADMIN')) return 'gold'
  if (r.includes('MANAGER')) return 'teal'
  return 'neutral'
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
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const channelTotal = analytics.topChannels.reduce((sum, c) => sum + c.messageCount, 0)
  const maxQuestions = Math.max(...analytics.aiUsage.map((a) => a.questions), 1)
  const maxUserMessages = Math.max(...analytics.topUsers.map((u) => u.messageCount), 1)
  const maxDailyMessages = Math.max(...analytics.dailyActivity.map((d) => d.messages), 1)

  return (
    <div>
      <PageHeader
        kicker="CLIENTS · TEAM CHAT"
        title="Chat Analytics"
        subtitle={
          <>
            Insights powered by <span className="font-medium text-foreground">Insight</span>, your AI
            analytics assistant
          </>
        }
        actions={
          <>
            <Segmented
              value={days}
              onChange={setDays}
              options={[
                { value: 1, label: '24h' },
                { value: 7, label: '7 days' },
                { value: 30, label: '30 days' },
              ]}
            />
            <Button variant="outline" size="icon-sm" onClick={fetchAnalytics} title="Refresh data">
              <RefreshCw className="size-4" />
            </Button>
          </>
        }
      />

      {/* Overview stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Messages"
          value={analytics.overview.totalMessages.toLocaleString()}
          sub={`${analytics.overview.userMessages.toLocaleString()} users · ${analytics.overview.aiMessages.toLocaleString()} AI`}
          icon={MessageSquare}
        />
        <StatCard
          label="Active Users"
          value={analytics.overview.activeUsers}
          sub={`${analytics.overview.last24h.users} in last 24h`}
          icon={Users}
        />
        <StatCard
          label="AI Interactions"
          value={analytics.overview.aiMessages.toLocaleString()}
          sub={`${analytics.overview.aiChannels} assistants active`}
          icon={Bot}
        />
        <StatCard
          label="Channels"
          value={analytics.overview.totalChannels}
          sub={`${analytics.topChannels.length} with activity`}
          icon={Hash}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="gap-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 />
            Overview
          </TabsTrigger>
          <TabsTrigger value="chat">
            <Sparkles />
            Ask Insight
          </TabsTrigger>
          <TabsTrigger value="digest">
            <Calendar />
            Digest
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top Channels */}
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  Top Active Channels
                </CardTitle>
                <CardDescription className="text-xs">Most active channels by message count</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topChannels.length > 0 ? (
                  <div>
                    {analytics.topChannels.slice(0, 5).map((channel, index) => {
                      const pct = channelTotal > 0 ? Math.round((channel.messageCount / channelTotal) * 100) : 0
                      return (
                        <BarRow
                          key={channel.id}
                          rank={index + 1}
                          name={channel.name}
                          chip={<Badge variant="neutral">{channel.type}</Badge>}
                          value={channel.messageCount.toLocaleString()}
                          meta={`${pct}%`}
                          pct={pct}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={MessageSquare}
                    title="No channel activity yet"
                    description="When the team starts chatting, the busiest channels will rank here."
                  />
                )}
              </CardContent>
            </Card>

            {/* AI Assistant Usage */}
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="size-4 text-muted-foreground" />
                  AI Assistant Usage
                </CardTitle>
                <CardDescription className="text-xs">Questions asked to each AI assistant</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.aiUsage.length > 0 ? (
                  <div>
                    {analytics.aiUsage.map((ai, index) => (
                      <BarRow
                        key={index}
                        rank={index + 1}
                        name={ai.name}
                        chip={
                          <Badge variant="gold">
                            <Sparkles />
                            AI
                          </Badge>
                        }
                        value={`${ai.questions.toLocaleString()} questions`}
                        meta={`${ai.uniqueUsers} users`}
                        pct={Math.round((ai.questions / maxQuestions) * 100)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Bot}
                    title="No one's asked the assistants yet"
                    description="Questions to your AI assistants will rank here as the team puts them to work."
                  />
                )}
              </CardContent>
            </Card>

            {/* Top Contributors */}
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  Top Contributors
                </CardTitle>
                <CardDescription className="text-xs">Most active team members</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topUsers.length > 0 ? (
                  <div>
                    {analytics.topUsers.map((user, index) => (
                      <BarRow
                        key={user.id}
                        rank={index + 1}
                        name={user.name}
                        chip={<Badge variant={roleTone(user.role)}>{user.role}</Badge>}
                        value={user.messageCount.toLocaleString()}
                        pct={Math.round((user.messageCount / maxUserMessages) * 100)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="The room is quiet"
                    description="Your most active teammates will show up here once messages start flowing."
                  />
                )}
              </CardContent>
            </Card>

            {/* Daily Activity */}
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-muted-foreground" />
                  Daily Activity
                </CardTitle>
                <CardDescription className="text-xs">Message activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.dailyActivity.length > 0 ? (
                  <div>
                    {analytics.dailyActivity.slice(-7).map((day) => (
                      <BarRow
                        key={day.date}
                        name={new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        value={`${day.messages.toLocaleString()} msgs`}
                        meta={`${day.users} users`}
                        pct={Math.round((day.messages / maxDailyMessages) * 100)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={TrendingUp}
                    title="Nothing logged this period"
                    description="Try a wider time range, or check back after the next shift's chatter."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ask Insight Tab */}
        <TabsContent value="chat">
          <Card className="flex h-[600px] flex-col gap-0 overflow-hidden py-0">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-gold-600/30 bg-gold-600/10 dark:border-gold-400/25 dark:bg-gold-400/12">
                  <Sparkles className="size-4 text-gold-600 dark:text-gold-400" />
                </div>
                <span className="font-display text-[17px] font-bold tracking-[-0.3px] text-foreground">
                  Ask Insight
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Chat with Insight about team communication patterns
              </p>
            </div>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <ScrollArea className="min-h-0 flex-1 px-4 pt-4">
                {chatMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <EmptyState
                      icon={Bot}
                      title="Hi! I'm Insight"
                      description="Ask me about your team's chat activity, engagement patterns, or AI assistant usage."
                      action={
                        <div className="max-w-md space-y-2 rounded-[10px] border border-border bg-secondary/50 p-3.5 text-left">
                          <p className="kicker text-muted-foreground">Try asking</p>
                          <ul className="space-y-1.5">
                            <li className="flex items-start gap-2">
                              <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-gold-600 dark:text-gold-400" />
                              <span className="text-xs text-foreground">
                                "What are the most common questions employees ask?"
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-gold-600 dark:text-gold-400" />
                              <span className="text-xs text-foreground">
                                "Which channels have the most engagement?"
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Bot className="mt-0.5 size-3.5 shrink-0 text-gold-600 dark:text-gold-400" />
                              <span className="text-xs text-foreground">
                                "How are people using the AI assistants?"
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-gold-600 dark:text-gold-400" />
                              <span className="text-xs text-foreground">
                                "What topics are trending this week?"
                              </span>
                            </li>
                          </ul>
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <div className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-gold-600/10 dark:bg-gold-400/12">
                            <Bot className="size-4 text-gold-600 dark:text-gold-400" />
                          </div>
                        )}
                        <div className={`flex max-w-[75%] flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div
                            className={cn(
                              'rounded-[10px] px-3 py-2',
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-border bg-secondary text-foreground'
                            )}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                          </div>
                          <p className="mt-1 px-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="border-t border-border p-3">
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
                    className="max-h-[100px] min-h-[50px] resize-none text-sm"
                    disabled={isChatting}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatting}
                    variant="gold"
                    size="icon"
                    className="h-[50px] w-[50px]"
                  >
                    {isChatting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Digest Tab */}
        <TabsContent value="digest">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-gold-600/30 bg-gold-600/10 dark:border-gold-400/25 dark:bg-gold-400/12">
                  <Calendar className="size-4 text-gold-600 dark:text-gold-400" />
                </div>
                Team Activity Digest
              </CardTitle>
              <CardDescription className="text-xs">
                AI-generated summary of team communication and activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  value={digestType}
                  onChange={setDigestType}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                  ]}
                />
                <Button
                  onClick={generateDigest}
                  disabled={isGeneratingDigest}
                  variant="gold"
                  size="sm"
                  className="ml-auto"
                >
                  {isGeneratingDigest ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      Generate Digest
                    </>
                  )}
                </Button>
              </div>

              {digest && (
                <div className="space-y-4">
                  <div className="rounded-[10px] border border-border bg-secondary/50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-display text-[15px] font-bold tracking-[-0.2px] text-foreground">
                          {digest.type.charAt(0).toUpperCase() + digest.type.slice(1)} Digest
                        </h3>
                        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                          {new Date(digest.period.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} –{' '}
                          {new Date(digest.period.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-center">
                          <div className="font-display text-xl font-bold tabular-nums text-foreground">
                            {digest.metrics.totalMessages.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">Messages</div>
                        </div>
                        <div className="text-center">
                          <div className="font-display text-xl font-bold tabular-nums text-foreground">
                            {digest.metrics.activeUsers}
                          </div>
                          <div className="text-xs text-muted-foreground">Users</div>
                        </div>
                        <div className="text-center">
                          <div className="font-display text-xl font-bold tabular-nums text-foreground">
                            {digest.metrics.activeChannels}
                          </div>
                          <div className="text-xs text-muted-foreground">Channels</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[10px] border border-border bg-background p-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {digest.content}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="gold">
                      <Sparkles />
                      Generated by Insight
                    </Badge>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
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
                <EmptyState
                  icon={Sparkles}
                  title="No digest yet"
                  description="Pick daily or weekly, then let Insight write up what the team has been talking about."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
