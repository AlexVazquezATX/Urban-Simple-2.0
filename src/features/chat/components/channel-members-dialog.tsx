'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Loader2, UserPlus, X, Crown, Shield } from 'lucide-react'

interface ChannelMember {
  id: string
  role: string
  joinedAt: Date
  user: {
    id: string
    firstName: string
    lastName: string
    displayName?: string
    email: string
  }
}

interface ChannelMembersDialogProps {
  channelId: string | null
  channelName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onInviteMembers?: () => void
}

export function ChannelMembersDialog({
  channelId,
  channelName,
  isOpen,
  onOpenChange,
  onInviteMembers,
}: ChannelMembersDialogProps) {
  const [members, setMembers] = useState<ChannelMember[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && channelId) {
      fetchMembers()
    }
  }, [isOpen, channelId])

  const fetchMembers = async () => {
    if (!channelId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/chat/channels/${channelId}/members`)
      const data = await response.json()

      if (response.ok) {
        setMembers(data.members || [])
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
      toast.error('Failed to load members')
    } finally {
      setIsLoading(false)
    }
  }

  const removeMember = async (userId: string) => {
    if (!channelId) return

    try {
      const response = await fetch(
        `/api/chat/channels/${channelId}/members?userId=${userId}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        setMembers((prev) => prev.filter((m) => m.user.id !== userId))
        toast.success('Member removed')
      } else {
        throw new Error('Failed to remove member')
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Failed to remove member')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />
      case 'admin':
        return <Shield className="h-3 w-3" />
      default:
        return null
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <Badge variant="default" className="gap-1">
            <Crown className="h-3 w-3" />
            Owner
          </Badge>
        )
      case 'admin':
        return (
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        )
      default:
        return <Badge variant="outline">Member</Badge>
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Channel Members</DialogTitle>
          <DialogDescription>
            Manage members for #{channelName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-2">
                {members.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No members yet
                  </div>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {getInitials(
                            member.user.firstName,
                            member.user.lastName
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.user.displayName ||
                            `${member.user.firstName} ${member.user.lastName}`}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(member.role)}
                        {member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMember(member.user.id)}
                            title="Remove member"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </p>
              {onInviteMembers && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    onInviteMembers()
                    onOpenChange(false)
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  Add Member
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
