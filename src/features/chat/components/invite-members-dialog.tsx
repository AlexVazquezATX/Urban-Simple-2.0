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
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Loader2, Search, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface User {
  id: string
  firstName: string
  lastName: string
  displayName?: string
  email: string
}

interface InviteMembersDialogProps {
  channelId: string | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onMembersInvited: () => void
}

export function InviteMembersDialog({
  channelId,
  isOpen,
  onOpenChange,
  onMembersInvited,
}: InviteMembersDialogProps) {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  )
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    if (isOpen && channelId) {
      fetchAvailableUsers()
      setSearchQuery('')
      setSelectedUserIds(new Set())
    }
  }, [isOpen, channelId])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(
        users.filter(
          (user) =>
            user.firstName.toLowerCase().includes(query) ||
            user.lastName.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.displayName?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, users])

  const fetchAvailableUsers = async () => {
    if (!channelId) return

    setIsLoading(true)
    try {
      // Fetch all users
      const usersResponse = await fetch('/api/users')
      const usersData = await usersResponse.json()

      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users')
      }

      // Fetch current members
      const membersResponse = await fetch(
        `/api/chat/channels/${channelId}/members`
      )
      const membersData = await membersResponse.json()

      if (!membersResponse.ok) {
        throw new Error('Failed to fetch members')
      }

      // Filter out users who are already members
      const memberIds = new Set(membersData.members.map((m: any) => m.user.id))
      const availableUsers = usersData.users.filter(
        (user: User) => !memberIds.has(user.id)
      )

      setUsers(availableUsers)
      setFilteredUsers(availableUsers)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const handleInvite = async () => {
    if (!channelId || selectedUserIds.size === 0) return

    setIsInviting(true)
    try {
      const response = await fetch(`/api/chat/channels/${channelId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to invite members')
      }

      toast.success(
        `Invited ${selectedUserIds.size} ${
          selectedUserIds.size === 1 ? 'member' : 'members'
        }`
      )
      onMembersInvited()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to invite members:', error)
      toast.error(error.message || 'Failed to invite members')
    } finally {
      setIsInviting(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  const getDisplayName = (user: User) => {
    return user.displayName || `${user.firstName} ${user.lastName}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Select team members to invite to this channel
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {searchQuery
                      ? 'No users found matching your search'
                      : 'All team members are already in this channel'}
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.has(user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-sm">
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium truncate">
                            {getDisplayName(user)}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>

            {selectedUserIds.size > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedUserIds.size} selected
                </p>
                <Button onClick={handleInvite} disabled={isInviting}>
                  {isInviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Inviting...
                    </>
                  ) : (
                    `Invite ${selectedUserIds.size} ${
                      selectedUserIds.size === 1 ? 'Member' : 'Members'
                    }`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
