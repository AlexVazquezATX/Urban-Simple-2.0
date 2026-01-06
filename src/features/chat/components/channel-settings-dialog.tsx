'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Trash2, UserPlus, Users } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Channel {
  id: string
  name: string
  slug: string
  description?: string
  type: string
}

interface ChannelSettingsDialogProps {
  channel: Channel | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onChannelUpdated: () => void
  onChannelDeleted: () => void
  onViewMembers: () => void
  onInviteMembers: () => void
}

export function ChannelSettingsDialog({
  channel,
  isOpen,
  onOpenChange,
  onChannelUpdated,
  onChannelDeleted,
  onViewMembers,
  onInviteMembers,
}: ChannelSettingsDialogProps) {
  const [name, setName] = useState(channel?.name || '')
  const [description, setDescription] = useState(channel?.description || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Update local state when channel changes
  useState(() => {
    if (channel) {
      setName(channel.name)
      setDescription(channel.description || '')
    }
  })

  const handleUpdate = async () => {
    if (!channel) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/chat/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })

      if (!response.ok) {
        throw new Error('Failed to update channel')
      }

      toast.success('Channel updated')
      onChannelUpdated()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to update channel:', error)
      toast.error(error.message || 'Failed to update channel')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!channel) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/chat/channels/${channel.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete channel')
      }

      toast.success('Channel deleted')
      onChannelDeleted()
      onOpenChange(false)
      setShowDeleteConfirm(false)
    } catch (error: any) {
      console.error('Failed to delete channel:', error)
      toast.error(error.message || 'Failed to delete channel')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!channel) return null

  // Don't allow editing DMs
  const isDM = channel.type === 'direct_message'

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isDM ? 'Conversation Settings' : 'Channel Settings'}
            </DialogTitle>
            <DialogDescription>
              {isDM
                ? 'Manage this conversation'
                : `Manage settings for #${channel.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isDM && (
              <>
                <div>
                  <Label htmlFor="name">Channel Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., general, marketing, dev-team"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this channel about?"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Member Management Buttons */}
            <div className="space-y-2 pt-4 border-t">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onViewMembers()
                  onOpenChange(false)
                }}
              >
                <Users className="h-4 w-4" />
                View Members
              </Button>

              {!isDM && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    onInviteMembers()
                    onOpenChange(false)
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Members
                </Button>
              )}
            </div>

            {/* Danger Zone */}
            {!isDM && (
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Channel
                </Button>
              </div>
            )}
          </div>

          {!isDM && (
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete #{channel.name}? This will
              permanently delete all messages and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Channel'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
