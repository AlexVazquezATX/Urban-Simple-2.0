'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Loader2, Plus, MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AttachmentRenderer } from './attachments/attachment-renderer'
import type { MessageAttachment } from '../types/ai-types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: MessageAttachment[]
}

interface Conversation {
  id: string
  title: string
  messageCount: number
  lastMessage?: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

interface AIChatSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AIChatSidebar({ isOpen, onClose }: AIChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showConversations, setShowConversations] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 100)
    }
  }, [messages, messages.length])

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  // Load conversations when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadConversations()
    }
  }, [isOpen])

  // Load conversation history when switching conversations
  useEffect(() => {
    if (currentConversationId) {
      loadConversationHistory(currentConversationId)
    }
  }, [currentConversationId])

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/ai/conversations')
      const data = await response.json()

      if (response.ok && data.success) {
        setConversations(data.conversations)

        // Set current conversation to the active one
        const active = data.conversations.find((c: Conversation) => c.isActive)
        if (active) {
          setCurrentConversationId(active.id)
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const loadConversationHistory = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}/messages`)
      const data = await response.json()

      if (response.ok && data.success) {
        // Convert database messages to ChatMessage format
        const loadedMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
        }))
        setMessages(loadedMessages)
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setCurrentConversationId(data.conversationId)
        setMessages([])
        await loadConversations()
        setShowConversations(false)
        toast.success('New conversation started')
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
      toast.error('Failed to create new conversation')
    }
  }

  const switchConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}/switch`, {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setCurrentConversationId(conversationId)
        await loadConversations()
        setShowConversations(false)
      }
    } catch (error) {
      console.error('Failed to switch conversation:', error)
      toast.error('Failed to switch conversation')
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (response.ok && data.success) {
        // If we deleted the current conversation, clear messages
        if (conversationId === currentConversationId) {
          setMessages([])
          setCurrentConversationId(null)
        }
        await loadConversations()
        toast.success('Conversation deleted')
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      toast.error('Failed to delete conversation')
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          includeContext: true,
          conversationId: currentConversationId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response')
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        attachments: data.attachments || [],
      }

      setMessages((prev) => [...prev, aiMessage])

      // Reload conversations to update title and message count
      await loadConversations()
    } catch (error: any) {
      console.error('Chat error:', error)
      toast.error(error.message || 'Failed to get AI response')

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'm sorry, I encountered an error. Please make sure the AI assistant is properly configured with a GEMINI_API_KEY.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const suggestedPrompts = [
    "Hey Cassie! Show me my revenue trends",
    'Who owes me money?',
    "What's my schedule this week?",
    "How's my team performing?",
    'Any issues I should know about?',
    'Give me a business overview',
  ]

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full md:w-[500px] bg-background border-l shadow-2xl z-50 transform transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Cassie</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowConversations(!showConversations)}
                title="Conversations"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={createNewConversation}
                title="New Conversation"
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Conversations Panel */}
          {showConversations && (
            <div className="border-b bg-muted/50">
              <ScrollArea className="max-h-[300px]">
                <div className="p-2 space-y-1">
                  {conversations.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No conversations yet
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          'flex items-start justify-between p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors',
                          conv.isActive && 'bg-accent'
                        )}
                        onClick={() => switchConversation(conv.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {conv.title}
                          </p>
                          {conv.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {conv.lastMessage}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {conv.messageCount} messages • {new Date(conv.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 ml-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConversationToDelete(conv.id)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4"  ref={scrollRef as any}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Hey Alex! I'm Cassie 👋
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Your personal AI business assistant. Ask me about revenue,
                  schedules, team performance, or anything Urban Simple!
                </p>

                <div className="w-full max-w-sm space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Try asking:
                  </p>
                  {suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="w-full text-left text-sm p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' && 'flex-row-reverse'
                    )}
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.role === 'user' ? (
                        <span className="text-xs font-semibold">You</span>
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 max-w-[80%]">
                      <div
                        className={cn(
                          'rounded-lg p-3',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {/* Render attachments for assistant messages */}
                      {message.role === 'assistant' && message.attachments && (
                        <AttachmentRenderer attachments={message.attachments} />
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1 rounded-lg p-3 bg-muted max-w-[80%]">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            </ScrollArea>
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                {isLoading ? (
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
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (conversationToDelete) {
                  deleteConversation(conversationToDelete)
                  setConversationToDelete(null)
                  setDeleteDialogOpen(false)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
