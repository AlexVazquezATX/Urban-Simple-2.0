'use client'

import { useState, useEffect } from 'react'
import { Bot, Loader2, Lock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface AIPersona {
  id: string
  name: string
  nameEs: string
  aiName: string
  description: string
  descriptionEs: string
  icon: string
  allowedRoles?: string[]
  isCreated: boolean
}

interface CreateAIChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChannelCreated?: () => void
}

// Role-access chips follow the role-pill mapping:
// Super Admin/Admin → gold, Manager → teal, everyone else → neutral.
function roleChipTone(role: string): 'gold' | 'teal' | 'neutral' {
  const normalized = role.toUpperCase().replace(/[\s-]+/g, '_')
  if (normalized === 'SUPER_ADMIN' || normalized === 'ADMIN') return 'gold'
  if (normalized === 'MANAGER') return 'teal'
  return 'neutral'
}

export function CreateAIChannelDialog({
  open,
  onOpenChange,
  onChannelCreated,
}: CreateAIChannelDialogProps) {
  const [personas, setPersonas] = useState<AIPersona[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [creatingPersona, setCreatingPersona] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchPersonas()
    }
  }, [open])

  const fetchPersonas = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/chat/channels/create-ai')
      const data = await response.json()

      if (response.ok) {
        setPersonas(data.personas || [])
        setUserRole(data.userRole || null)
      } else {
        throw new Error(data.error || 'Failed to fetch AI personas')
      }
    } catch (error: any) {
      console.error('Failed to fetch personas:', error)
      toast.error(error.message || 'Failed to load AI assistants')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateChannel = async (personaId: string) => {
    try {
      setCreatingPersona(personaId)

      const response = await fetch('/api/chat/channels/create-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: personaId,
          languages: ['en', 'es'], // Support both English and Spanish
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${data.channel.name} channel created successfully!`)
        await fetchPersonas() // Refresh the list
        if (onChannelCreated) {
          onChannelCreated()
        }
      } else {
        throw new Error(data.error || 'Failed to create AI channel')
      }
    } catch (error: any) {
      console.error('Failed to create AI channel:', error)
      toast.error(error.message || 'Failed to create AI channel')
    } finally {
      setCreatingPersona(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-gold-600/30 bg-gold-600/10 dark:border-gold-400/25 dark:bg-gold-400/12">
              <Bot className="size-4 text-gold-600 dark:text-gold-400" />
            </span>
            Create AI Assistant Channel
          </DialogTitle>
          <DialogDescription>
            Add specialized AI assistants to help your team with common questions.
            AI channels support both English and Spanish.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className="rounded-[14px] border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/40 dark:shadow-none"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className="grid size-12 shrink-0 place-items-center rounded-[12px] border border-gold-600/30 bg-gold-600/10 text-2xl dark:border-gold-400/25 dark:bg-gold-400/12">
                      {persona.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-display text-[15px] font-bold tracking-[-0.2px] text-foreground">
                          {persona.aiName}
                        </h3>
                        <Badge variant="neutral">{persona.name}</Badge>
                        {persona.isCreated && (
                          <Badge variant="green">Already Created</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {persona.description}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        ES: {persona.descriptionEs}
                      </p>
                      {persona.allowedRoles && (
                        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                          <span className="kicker text-muted-foreground">Access</span>
                          {persona.allowedRoles.map((role) => (
                            <Badge key={role} variant={roleChipTone(role)}>
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleCreateChannel(persona.id)}
                    disabled={persona.isCreated || creatingPersona === persona.id || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')}
                    size="sm"
                    variant={persona.isCreated ? 'outline' : 'gold'}
                    title={userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' ? 'Only administrators can create AI channels' : undefined}
                  >
                    {creatingPersona === persona.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : persona.isCreated ? (
                      'Created'
                    ) : userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' ? (
                      'Admin Only'
                    ) : (
                      'Create Channel'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && (
          <div className="mt-6 rounded-[12px] border border-gold-600/30 bg-gold-600/10 p-4 dark:border-gold-400/25 dark:bg-gold-400/12">
            <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <Lock className="size-3.5 text-gold-600 dark:text-gold-400" />
              Administrator Access Required
            </p>
            <p className="text-[13px] text-muted-foreground">
              Only administrators can create AI assistant channels. Contact your administrator to request new AI assistants for your team.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-[12px] border border-teal-600/30 bg-teal-600/10 p-4 dark:border-teal-300/25 dark:bg-teal-300/12">
          <p className="mb-1.5 text-[13px] font-semibold text-foreground">
            About AI Assistants
          </p>
          <ul className="space-y-1 text-[13px] text-muted-foreground">
            <li>• AI assistants use Gemini 2.0 Flash for fast, intelligent responses</li>
            <li>• All conversations are saved for context and training</li>
            <li>• Bilingual support - responds in English or Spanish automatically</li>
            <li>• Available 24/7 to answer common employee questions</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
