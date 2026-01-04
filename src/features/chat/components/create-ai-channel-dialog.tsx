'use client'

import { useState, useEffect } from 'react'
import { Bot, Loader2 } from 'lucide-react'
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
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-ocean-600" />
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
                className="border rounded-lg p-4 hover:border-ocean-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-3xl">{persona.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{persona.aiName}</h3>
                        <Badge variant="outline" className="text-xs">{persona.name}</Badge>
                        {persona.isCreated && (
                          <Badge variant="secondary" className="bg-ocean-100 text-ocean-700">
                            Already Created
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {persona.description}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        ES: {persona.descriptionEs}
                      </p>
                      {persona.allowedRoles && (
                        <div className="mt-2 flex items-center gap-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Access:</span>
                          {persona.allowedRoles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
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
                    className={persona.isCreated ? '' : 'bg-ocean-600 hover:bg-ocean-700'}
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
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-900 font-medium mb-2">
              🔒 Administrator Access Required
            </p>
            <p className="text-sm text-amber-800">
              Only administrators can create AI assistant channels. Contact your administrator to request new AI assistants for your team.
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-ocean-50 rounded-lg border border-ocean-200">
          <p className="text-sm text-ocean-900 font-medium mb-2">
            💡 About AI Assistants
          </p>
          <ul className="text-sm text-ocean-800 space-y-1">
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
