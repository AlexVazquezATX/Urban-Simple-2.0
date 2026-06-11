'use client'

import { useState, useEffect, useRef } from 'react'
import { Hash, Plus, Send, Search, Users, Loader2, Star, Lock, Settings, Bot, Sparkles, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CreateChannelDialog } from './create-channel-dialog'
import { ChannelMembersDialog } from './channel-members-dialog'
import { StartDMDialog } from './start-dm-dialog'
import { ChannelSettingsDialog } from './channel-settings-dialog'
import { InviteMembersDialog } from './invite-members-dialog'
import { CreateAIChannelDialog } from './create-ai-channel-dialog'

interface Channel {
  id: string
  name: string
  slug: string
  description?: string
  type: string
  isFavorite?: boolean
  memberRole?: string | null
  isMember?: boolean
  unreadCount?: number
  isAiEnabled?: boolean
  aiPersona?: string
  aiLanguages?: string[]
}

interface Message {
  id: string
  userId: string
  content: string
  createdAt: Date
  isAiGenerated?: boolean
  aiModel?: string
  user: {
    firstName: string
    lastName: string
    displayName?: string
  }
}

// Channel Item Component — mirrors the sidebar item recipe: active row gets
// the gold dim fill + gold text, idle rows stay muted with a soft hover.
function ChannelItem({
  channel,
  isActive,
  onSelect,
  onToggleFavorite,
}: {
  channel: Channel
  isActive: boolean
  onSelect: () => void
  onToggleFavorite: () => void
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-[13.5px] transition-all duration-150',
        isActive
          ? 'border-primary/25 bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
      )}
    >
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 text-left min-w-0 overflow-hidden"
      >
        {channel.isAiEnabled ? (
          <Bot
            className={cn(
              'h-4 w-4 flex-shrink-0',
              isActive ? 'text-primary' : 'text-gold-600 dark:text-gold-400'
            )}
          />
        ) : channel.type === 'private' ? (
          <Lock className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
        ) : (
          <Hash className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
        )}
        <span className="truncate">{channel.name}</span>
        {channel.isAiEnabled && (
          <Badge variant="gold" className="ml-1">
            <Sparkles />
            AI
          </Badge>
        )}
      </button>
      {channel.unreadCount && channel.unreadCount > 0 && (
        <Badge variant="default" className="flex-shrink-0 font-mono tabular-nums">
          {channel.unreadCount}
        </Badge>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite()
        }}
        className={cn(
          'p-0.5 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
          channel.isFavorite && 'opacity-100'
        )}
        title={
          channel.isFavorite
            ? 'Remove from favorites'
            : 'Add to favorites'
        }
      >
        <Star
          className={cn(
            'h-3.5 w-3.5',
            channel.isFavorite && 'fill-gold-500 text-gold-500'
          )}
        />
      </button>
    </div>
  )
}

export function TeamChat() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)
  const [isCreateAIChannelOpen, setIsCreateAIChannelOpen] = useState(false)
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const [isStartDMOpen, setIsStartDMOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [memberCount, setMemberCount] = useState<number>(0)
  const [userRole, setUserRole] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch channels on mount
  useEffect(() => {
    fetchChannels()
  }, [])

  // Fetch messages and member count when active channel changes
  useEffect(() => {
    if (activeChannel) {
      fetchMessages(activeChannel.id)
      fetchMemberCount(activeChannel.id)
    }
  }, [activeChannel])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/chat/channels')
      const data = await response.json()

      if (response.ok) {
        setChannels(data.channels || [])
        // Auto-select first channel
        if (data.channels && data.channels.length > 0) {
          setActiveChannel(data.channels[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error)
      toast.error('Failed to load channels')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessages = async (channelId: string) => {
    try {
      const response = await fetch(`/api/chat/channels/${channelId}/messages`)
      const data = await response.json()

      if (response.ok) {
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      toast.error('Failed to load messages')
    }
  }

  const fetchMemberCount = async (channelId: string) => {
    try {
      const response = await fetch(`/api/chat/channels/${channelId}/members`)
      const data = await response.json()

      if (response.ok) {
        setMemberCount(data.members?.length || 0)
      }
    } catch (error) {
      console.error('Failed to fetch member count:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChannel || isSending) return

    setIsSending(true)
    try {
      // Use AI endpoint if this is an AI-enabled channel
      if (activeChannel.isAiEnabled) {
        const response = await fetch('/api/chat/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: activeChannel.id,
            message: messageInput.trim(),
            language: 'en', // TODO: Detect language from input or user preference
          }),
        })

        const data = await response.json()

        if (response.ok) {
          // Add both user message and AI response to list
          setMessages((prev) => [...prev, data.userMessage, data.aiMessage])
          setMessageInput('')
        } else {
          throw new Error(data.error || 'Failed to get AI response')
        }
      } else {
        // Regular message sending for non-AI channels
        const response = await fetch(`/api/chat/channels/${activeChannel.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: messageInput.trim() }),
        })

        const data = await response.json()

        if (response.ok) {
          // Add new message to list
          setMessages((prev) => [...prev, data.message])
          setMessageInput('')
        } else {
          throw new Error(data.error || 'Failed to send message')
        }
      }
    } catch (error: any) {
      console.error('Failed to send message:', error)
      toast.error(error.message || 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleFavorite = async (channelId: string, currentFavorite: boolean) => {
    try {
      const response = await fetch(`/api/chat/channels/${channelId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !currentFavorite }),
      })

      if (response.ok) {
        // Update local state
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === channelId ? { ...ch, isFavorite: !currentFavorite } : ch
          )
        )
        toast.success(
          !currentFavorite ? 'Added to favorites' : 'Removed from favorites'
        )
      } else {
        throw new Error('Failed to toggle favorite')
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      toast.error('Failed to update favorite')
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  const getDisplayName = (message: Message) => {
    return message.user.displayName || `${message.user.firstName} ${message.user.lastName}`
  }

  const handleDMCreated = async (channelId: string) => {
    // Refresh channels to show the new DM
    await fetchChannels()
    // Find and set the newly created DM as active
    const newChannel = channels.find((ch) => ch.id === channelId)
    if (newChannel) {
      setActiveChannel(newChannel)
    } else {
      // If not in current channels list yet, fetch again and retry
      const response = await fetch('/api/chat/channels')
      const data = await response.json()
      if (data.success) {
        setChannels(data.channels)
        const dmChannel = data.channels.find((ch: Channel) => ch.id === channelId)
        if (dmChannel) {
          setActiveChannel(dmChannel)
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] min-h-[540px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[540px] flex-col">
      <PageHeader kicker="OPERATIONS · TEAM CHAT" title="Team Chat" className="mb-4" />

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[14px] border border-border bg-card shadow-soft dark:shadow-none">
        {/* Channels Rail */}
        <div className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="border-b border-sidebar-border p-4">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="font-display text-[15px] font-bold tracking-[-0.2px] text-foreground">
                Channels
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsCreateChannelOpen(true)}
                  title="Create new channel"
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsCreateAIChannelOpen(true)}
                  title="Create AI assistant channel (Admin only)"
                  className="text-gold-600 hover:bg-gold-600/10 hover:text-gold-700 dark:text-gold-400 dark:hover:bg-gold-400/12 dark:hover:text-gold-300"
                >
                  <Bot className="size-4" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search channels..."
                className="bg-background pl-9"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {/* Direct Messages Section */}
            <div className="p-2">
              <div className="mb-1 flex items-center justify-between px-2 py-1">
                <span className="kicker text-muted-foreground">
                  Direct Messages
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => setIsStartDMOpen(true)}
                  title="Start new DM"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {channels
                  .filter((ch) => ch.type === 'direct_message')
                  .sort((a, b) => {
                    if (a.isFavorite === b.isFavorite) {
                      return a.name.localeCompare(b.name)
                    }
                    return a.isFavorite ? -1 : 1
                  })
                  .map((channel) => (
                    <div
                      key={channel.id}
                      className={cn(
                        'group flex items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-[13.5px] transition-all duration-150',
                        activeChannel?.id === channel.id
                          ? 'border-primary/25 bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      )}
                    >
                      <button
                        onClick={() => setActiveChannel(channel)}
                        className="flex-1 flex items-center gap-2 text-left min-w-0 overflow-hidden"
                      >
                        <Avatar className="h-5 w-5 flex-shrink-0">
                          <AvatarFallback className="bg-secondary text-xs font-semibold text-foreground">
                            {channel.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{channel.name}</span>
                      </button>
                      {channel.unreadCount && channel.unreadCount > 0 && (
                        <Badge variant="default" className="flex-shrink-0 font-mono tabular-nums">
                          {channel.unreadCount}
                        </Badge>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(channel.id, channel.isFavorite || false)
                        }}
                        className={cn(
                          'p-0.5 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                          channel.isFavorite && 'opacity-100'
                        )}
                        title={
                          channel.isFavorite
                            ? 'Remove from favorites'
                            : 'Add to favorites'
                        }
                      >
                        <Star
                          className={cn(
                            'h-3.5 w-3.5',
                            channel.isFavorite && 'fill-gold-500 text-gold-500'
                          )}
                        />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <Separator className="my-2 bg-sidebar-border" />

            {/* Categorized Channels Section */}
            <div className="p-2">
              {channels.filter((ch) => ch.type !== 'direct_message').length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No channels yet — create one with the + above
                </div>
              ) : (
                <>
                  {/* Favorites */}
                  {channels.filter((ch) => ch.type !== 'direct_message' && ch.isFavorite).length > 0 && (
                    <div className="mb-4">
                      <div className="mb-1 flex items-center px-2 py-1">
                        <span className="kicker text-muted-foreground">
                          Favorites
                        </span>
                      </div>
                      <div className="space-y-1">
                        {channels
                          .filter((ch) => ch.type !== 'direct_message' && ch.isFavorite)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((channel) => (
                            <ChannelItem
                              key={channel.id}
                              channel={channel}
                              isActive={activeChannel?.id === channel.id}
                              onSelect={() => setActiveChannel(channel)}
                              onToggleFavorite={() => toggleFavorite(channel.id, channel.isFavorite || false)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* AI Assistants */}
                  {channels.filter((ch) => ch.isAiEnabled).length > 0 && (
                    <div className="mb-4">
                      <div className="mb-1 flex items-center px-2 py-1">
                        <span className="kicker text-muted-foreground">
                          AI Assistants
                        </span>
                      </div>
                      <div className="space-y-1">
                        {channels
                          .filter((ch) => ch.isAiEnabled)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((channel) => (
                            <ChannelItem
                              key={channel.id}
                              channel={channel}
                              isActive={activeChannel?.id === channel.id}
                              onSelect={() => setActiveChannel(channel)}
                              onToggleFavorite={() => toggleFavorite(channel.id, channel.isFavorite || false)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Private Channels */}
                  {channels.filter((ch) => ch.type === 'private' && !ch.isFavorite).length > 0 && (
                    <div className="mb-4">
                      <div className="mb-1 flex items-center px-2 py-1">
                        <span className="kicker text-muted-foreground">
                          Private Channels
                        </span>
                      </div>
                      <div className="space-y-1">
                        {channels
                          .filter((ch) => ch.type === 'private' && !ch.isFavorite)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((channel) => (
                            <ChannelItem
                              key={channel.id}
                              channel={channel}
                              isActive={activeChannel?.id === channel.id}
                              onSelect={() => setActiveChannel(channel)}
                              onToggleFavorite={() => toggleFavorite(channel.id, channel.isFavorite || false)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Public Channels */}
                  {channels.filter((ch) => ch.type === 'public' && !ch.isAiEnabled && !ch.isFavorite).length > 0 && (
                    <div className="mb-4">
                      <div className="mb-1 flex items-center px-2 py-1">
                        <span className="kicker text-muted-foreground">
                          Public Channels
                        </span>
                      </div>
                      <div className="space-y-1">
                        {channels
                          .filter((ch) => ch.type === 'public' && !ch.isAiEnabled && !ch.isFavorite)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((channel) => (
                            <ChannelItem
                              key={channel.id}
                              channel={channel}
                              isActive={activeChannel?.id === channel.id}
                              onSelect={() => setActiveChannel(channel)}
                              onToggleFavorite={() => toggleFavorite(channel.id, channel.isFavorite || false)}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {activeChannel ? (
            <>
              {/* Channel Header */}
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-2">
                  {activeChannel.type === 'direct_message' ? (
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-secondary text-xs font-semibold text-foreground">
                        {activeChannel.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : activeChannel.type === 'private' ? (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Hash className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {activeChannel.type === 'direct_message' ? (
                        <div className="flex items-center gap-1.5">
                          {activeChannel.name.split(',').map((name, index) => (
                            <span
                              key={index}
                              className="text-sm font-medium text-foreground"
                            >
                              {name.trim()}
                              {index < activeChannel.name.split(',').length - 1 && (
                                <span className="text-muted-foreground mx-1">,</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <h3 className="font-display text-[15px] font-bold tracking-[-0.2px] text-foreground">
                          {activeChannel.name}
                        </h3>
                      )}
                      {memberCount > 0 && (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          • {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </span>
                      )}
                    </div>
                    {activeChannel.description && (
                      <p className="text-xs text-muted-foreground">
                        {activeChannel.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsMembersDialogOpen(true)}
                    title="View members"
                  >
                    <Users className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsSettingsOpen(true)}
                    title="Channel settings"
                  >
                    <Settings className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="min-h-0 flex-1 bg-background">
                <div className="space-y-4 p-4">
                  {messages.length === 0 ? (
                    <EmptyState
                      icon={MessageSquare}
                      title="All quiet in here"
                      description="No messages yet — send the first one and get the conversation going."
                    />
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                          <AvatarFallback className={cn(
                            "text-xs font-semibold",
                            message.isAiGenerated
                              ? "bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400"
                              : "bg-secondary text-foreground"
                          )}>
                            {message.isAiGenerated ? (
                              <Bot className="h-4 w-4" />
                            ) : message.user ? (
                              getInitials(
                                message.user.firstName,
                                message.user.lastName
                              )
                            ) : (
                              'U'
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {message.user ? getDisplayName(message) : 'Unknown User'}
                            </span>
                            {message.isAiGenerated && (
                              <Badge variant="gold">
                                <Sparkles />
                                AI
                              </Badge>
                            )}
                            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                              {new Date(message.createdAt).toLocaleTimeString(
                                'en-US',
                                {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                          </div>
                          <div
                            className={cn(
                              'mt-1.5 w-fit max-w-[720px] whitespace-pre-wrap rounded-[14px] rounded-tl-[4px] border px-3.5 py-2.5 text-sm text-foreground',
                              message.isAiGenerated
                                ? 'border-gold-600/30 bg-gold-600/10 dark:border-gold-400/25 dark:bg-gold-400/12'
                                : 'border-border bg-card shadow-soft dark:shadow-none'
                            )}
                          >
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="shrink-0 border-t border-border p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      activeChannel.isAiEnabled
                        ? `Ask ${activeChannel.name} a question...`
                        : `Message #${activeChannel.name}`
                    }
                    className="min-h-[60px] max-h-[120px] resize-none bg-background"
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || isSending}
                    variant="gold"
                    size="icon"
                    className="h-[60px] w-[60px] shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-background">
              <EmptyState
                icon={MessageSquare}
                title="Welcome to Team Chat"
                description="Select a channel to start messaging your team"
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Channel Dialog */}
      <CreateChannelDialog
        open={isCreateChannelOpen}
        onOpenChange={setIsCreateChannelOpen}
        onChannelCreated={fetchChannels}
      />

      {/* Create AI Channel Dialog */}
      <CreateAIChannelDialog
        open={isCreateAIChannelOpen}
        onOpenChange={setIsCreateAIChannelOpen}
        onChannelCreated={fetchChannels}
      />

      {/* Channel Members Dialog */}
      <ChannelMembersDialog
        channelId={activeChannel?.id || null}
        channelName={activeChannel?.name || ''}
        isOpen={isMembersDialogOpen}
        onOpenChange={setIsMembersDialogOpen}
        onInviteMembers={() => setIsInviteOpen(true)}
      />

      {/* Start DM Dialog */}
      <StartDMDialog
        open={isStartDMOpen}
        onOpenChange={setIsStartDMOpen}
        onDMCreated={handleDMCreated}
      />

      {/* Channel Settings Dialog */}
      <ChannelSettingsDialog
        channel={activeChannel}
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onChannelUpdated={fetchChannels}
        onChannelDeleted={() => {
          setActiveChannel(null)
          fetchChannels()
        }}
        onViewMembers={() => setIsMembersDialogOpen(true)}
        onInviteMembers={() => setIsInviteOpen(true)}
      />

      {/* Invite Members Dialog */}
      <InviteMembersDialog
        channelId={activeChannel?.id || null}
        isOpen={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onMembersInvited={fetchChannels}
      />
    </div>
  )
}
