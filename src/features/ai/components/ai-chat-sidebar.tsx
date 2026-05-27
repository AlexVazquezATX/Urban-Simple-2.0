'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Sparkles, Loader2, Plus, MessageSquare, Trash2, ImagePlus } from 'lucide-react'
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

interface PendingImage {
  id: string
  /** data: URL for in-app preview (no separate fetch needed). */
  dataUrl: string
  /** Pure base64 (no prefix) — what we POST to /api/ai/chat. */
  base64: string
  mimeType: string
  /** Original file name when picked via file dialog; '' for pasted images. */
  name: string
  sizeBytes: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: MessageAttachment[]
  /** Images attached to a user message (kept only in session memory). */
  images?: PendingImage[]
}

const ACCEPTED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_IMAGES_PER_MESSAGE = 5
const MAX_BYTES_PER_IMAGE = 5 * 1024 * 1024 // ~5 MB

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
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive. The ref is attached to
  // shadcn's <ScrollArea> wrapper, but the actual scrollable element is the
  // Radix viewport (`[data-radix-scroll-area-viewport]`) inside it — calling
  // scrollTo on the wrapper is a no-op. Also scroll while loading so the
  // "Thinking..." indicator stays visible.
  useEffect(() => {
    if (!scrollRef.current) return
    const viewport = scrollRef.current.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]'
    )
    const target = viewport ?? scrollRef.current
    // Two RAFs so layout settles after the new message renders, especially
    // when attachments (proposed-action cards, charts) push content height.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' })
      })
    })
  }, [messages, isLoading])

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

  // Forward clarification-button clicks (dispatched as 'ai-chat-prompt'
  // CustomEvents) into the normal send flow. Using a ref keeps the listener
  // pointed at the latest handleSendMessage closure across re-renders.
  const promptHandlerRef = useRef<(text: string) => void>(() => {})
  useEffect(() => {
    promptHandlerRef.current = (text: string) => {
      void handleSendMessage(text)
    }
  })
  useEffect(() => {
    const onPrompt = (e: Event) => {
      const ce = e as CustomEvent<{ text?: string }>
      const text = ce.detail?.text?.trim()
      if (text) promptHandlerRef.current(text)
    }
    window.addEventListener('ai-chat-prompt', onPrompt as EventListener)
    return () =>
      window.removeEventListener('ai-chat-prompt', onPrompt as EventListener)
  }, [])

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

  // Convert a File into a PendingImage by reading as data URL. We split off
  // the base64 portion (everything after the comma) for the API payload, and
  // keep the full data URL for the in-app preview <img src=...>.
  const fileToPendingImage = useCallback(async (file: File): Promise<PendingImage | null> => {
    if (!ACCEPTED_IMAGE_MIME.includes(file.type)) {
      toast.error(`Unsupported image type: ${file.type || 'unknown'}`)
      return null
    }
    if (file.size > MAX_BYTES_PER_IMAGE) {
      toast.error(`Image too large (max 5 MB): ${file.name || 'pasted image'}`)
      return null
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.readAsDataURL(file)
    })
    const commaIdx = dataUrl.indexOf(',')
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : ''
    if (!base64) return null
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dataUrl,
      base64,
      mimeType: file.type,
      name: file.name || '',
      sizeBytes: file.size,
    }
  }, [])

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const room = MAX_IMAGES_PER_MESSAGE - pendingImages.length
    if (room <= 0) {
      toast.error(`Max ${MAX_IMAGES_PER_MESSAGE} images per message`)
      return
    }
    const slice = arr.slice(0, room)
    if (arr.length > slice.length) {
      toast.error(`Only added the first ${slice.length} (max ${MAX_IMAGES_PER_MESSAGE} per message)`)
    }
    const results = await Promise.all(slice.map(fileToPendingImage))
    const added = results.filter((r): r is PendingImage => r !== null)
    if (added.length > 0) {
      setPendingImages((prev) => [...prev, ...added])
    }
  }, [pendingImages.length, fileToPendingImage])

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      void addFiles(files)
    }
  }, [addFiles])

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => prev.filter((p) => p.id !== id))
  }

  const handleSendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    const imagesForThisSend = pendingImages
    if (!text && imagesForThisSend.length === 0) return
    if (isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      images: imagesForThisSend.length > 0 ? imagesForThisSend : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    if (!overrideText) setInput('')
    setPendingImages([])
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          includeContext: true,
          conversationId: currentConversationId,
          images: imagesForThisSend.map((img) => ({
            mimeType: img.mimeType,
            data: img.base64,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Surface the server's `details` field too — the top-level `error` is
        // usually a generic label like "Failed to get AI response" and the
        // real cause is in `details`.
        const detail = typeof data?.details === 'string' && data.details.trim().length > 0
          ? data.details
          : ''
        const errorType = typeof data?.errorType === 'string' ? data.errorType : ''
        const composed = [data?.error, detail && `(${detail})`, errorType && `[${errorType}]`]
          .filter(Boolean)
          .join(' ')
        throw new Error(composed || 'Failed to get AI response')
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

      // Add error message to chat. Show the actual server message so issues
      // beyond "missing key" (schema rejection, model errors, etc.) are visible
      // without digging through console logs.
      const detail =
        typeof error?.message === 'string' && error.message.trim().length > 0
          ? error.message
          : 'unknown error'
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm sorry, I hit an error: ${detail}. (Check the dev server console for the full stack.)`,
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
                        {message.images && message.images.length > 0 && (
                          <div className={cn(
                            'flex flex-wrap gap-2',
                            message.content ? 'mb-2' : ''
                          )}>
                            {message.images.map((img) => (
                              <img
                                key={img.id}
                                src={img.dataUrl}
                                alt={img.name || 'attached image'}
                                className="max-h-48 max-w-full rounded-md object-contain bg-black/10"
                              />
                            ))}
                          </div>
                        )}
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
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
            {/* Pending image thumbnails */}
            {pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative h-16 w-16 rounded-md overflow-hidden border bg-muted"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name || 'pasted image'}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingImage(img.id)}
                      className="absolute top-0.5 right-0.5 rounded-full bg-black/60 text-white p-0.5 hover:bg-black/80"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_MIME.join(',')}
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    void addFiles(e.target.files)
                  }
                  // Reset so the same file can be selected again later
                  e.target.value = ''
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-[60px] w-[44px] flex-shrink-0"
                disabled={isLoading || pendingImages.length >= MAX_IMAGES_PER_MESSAGE}
                onClick={() => fileInputRef.current?.click()}
                title="Attach image"
              >
                <ImagePlus className="h-5 w-5" />
              </Button>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={onPaste}
                placeholder="Ask me anything... (paste an image to share it)"
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
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
              Press Enter to send, Shift+Enter for new line · Paste or attach up to {MAX_IMAGES_PER_MESSAGE} images
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
