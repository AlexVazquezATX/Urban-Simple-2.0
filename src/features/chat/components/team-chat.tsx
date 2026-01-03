'use client'

import { useState, useEffect, useRef } from 'react'
import { Hash, Plus, Send, Search, Users, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CreateChannelDialog } from './create-channel-dialog'

interface Channel {
  id: string
  name: string
  slug: string
  description?: string
  type: string
  unreadCount?: number
}

interface Message {
  id: string
  userId: string
  content: string
  createdAt: Date
  user: {
    firstName: string
    lastName: string
    displayName?: string
  }
}

export function TeamChat() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch channels on mount
  useEffect(() => {
    fetchChannels()
  }, [])

  // Fetch messages when active channel changes
  useEffect(() => {
    if (activeChannel) {
      fetchMessages(activeChannel.id)
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

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChannel || isSending) return

    setIsSending(true)
    try {
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  const getDisplayName = (message: Message) => {
    return message.user.displayName || `${message.user.firstName} ${message.user.lastName}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Channels Sidebar */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Channels</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCreateChannelOpen(true)}
              title="Create new channel"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {channels.length === 0 ? (
              <div className="text-center p-4 text-sm text-muted-foreground">
                No channels yet
              </div>
            ) : (
              channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    activeChannel?.id === channel.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  )}
                >
                  <Hash className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{channel.name}</span>
                  {channel.unreadCount && channel.unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {channel.unreadCount}
                    </Badge>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Channel Header */}
            <div className="h-14 border-b px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">{activeChannel.name}</h3>
                  {activeChannel.description && (
                    <p className="text-xs text-muted-foreground">
                      {activeChannel.description}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Users className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="text-xs">
                          {getInitials(
                            message.user.firstName,
                            message.user.lastName
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-sm">
                            {getDisplayName(message)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleTimeString(
                              'en-US',
                              {
                                hour: 'numeric',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${activeChannel.name}`}
                  className="min-h-[60px] max-h-[120px] resize-none"
                  disabled={isSending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                  size="icon"
                  className="h-[60px] w-[60px]"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Hash className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold mb-2">Welcome to Team Chat</p>
              <p className="text-sm">
                Select a channel to start messaging your team
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Channel Dialog */}
      <CreateChannelDialog
        open={isCreateChannelOpen}
        onOpenChange={setIsCreateChannelOpen}
        onChannelCreated={fetchChannels}
      />
    </div>
  )
}
