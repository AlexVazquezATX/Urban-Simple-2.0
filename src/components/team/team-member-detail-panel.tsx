'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Loader2,
  Mail,
  Phone,
  Building2,
  Shield,
  User,
  UserCheck,
  Users,
  UserX,
  Key,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string | null
  phone: string | null
  role: string
  isActive: boolean
  branchId: string | null
  branch: {
    id: string
    name: string
    code: string
  } | null
  createdAt: string
}

interface Branch {
  id: string
  name: string
  code: string
}

interface TeamMemberDetailPanelProps {
  member: TeamMember | null
  isNew?: boolean
  branches: Branch[]
  onClose: () => void
  onSave: (savedMember?: TeamMember) => void
  onDelete?: (memberId: string) => void
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ASSOCIATE: 'Associate',
  CLIENT_USER: 'Client User',
}

const roleIcons: Record<string, typeof Shield> = {
  SUPER_ADMIN: Shield,
  ADMIN: Shield,
  MANAGER: UserCheck,
  ASSOCIATE: User,
  CLIENT_USER: Users,
}

// Chip mapping per the design system: Super Admin/Admin → gold,
// Manager → teal, Associate (and everything else) → neutral.
const roleBadgeVariants: Record<string, 'gold' | 'teal' | 'neutral'> = {
  SUPER_ADMIN: 'gold',
  ADMIN: 'gold',
  MANAGER: 'teal',
  ASSOCIATE: 'neutral',
  CLIENT_USER: 'neutral',
}

export function TeamMemberDetailPanel({
  member,
  isNew,
  branches,
  onClose,
  onSave,
  onDelete,
}: TeamMemberDetailPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false)

  // Form state
  const [email, setEmail] = useState(member?.email || '')
  const [firstName, setFirstName] = useState(member?.firstName || '')
  const [lastName, setLastName] = useState(member?.lastName || '')
  const [displayName, setDisplayName] = useState(member?.displayName || '')
  const [phone, setPhone] = useState(member?.phone || '')
  const [role, setRole] = useState(member?.role || 'ASSOCIATE')
  const [branchId, setBranchId] = useState<string>(member?.branchId || '')
  const [isActive, setIsActive] = useState(member?.isActive ?? true)
  const [createAuthAccount, setCreateAuthAccount] = useState(false)
  const [password, setPassword] = useState('')

  // Trigger slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  // Reset form when member changes
  useEffect(() => {
    setEmail(member?.email || '')
    setFirstName(member?.firstName || '')
    setLastName(member?.lastName || '')
    setDisplayName(member?.displayName || '')
    setPhone(member?.phone || '')
    setRole(member?.role || 'ASSOCIATE')
    setBranchId(member?.branchId || '')
    setIsActive(member?.isActive ?? true)
    setCreateAuthAccount(false)
    setPassword('')
  }, [member])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 200) // Wait for animation
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return

    setLoading(true)
    try {
      const payload: any = {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
        branchId: branchId || undefined,
        isActive,
      }

      if (member && !isNew) {
        // Update existing member
        if (createAuthAccount && password) {
          payload.password = password
        }

        const response = await fetch(`/api/users/${member.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update member')
        }

        const savedMember = await response.json()
        toast.success('Team member updated')
        onSave(savedMember)
        router.refresh()
      } else {
        // Create new member
        if (createAuthAccount && password) {
          payload.password = password
        } else if (createAuthAccount && !password) {
          throw new Error('Password is required when creating an auth account')
        }

        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create member')
        }

        const savedMember = await response.json()
        toast.success('Team member added')
        onSave(savedMember)
        router.refresh()
      }

      handleClose()
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (member && onDelete) {
      onDelete(member.id)
      handleClose()
    }
  }

  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : '??'

  const RoleIcon = roleIcons[role] || User

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-ink-950/30 transition-opacity duration-200',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full max-w-md bg-card shadow-xl border-l border-border flex flex-col transition-transform duration-200 ease-out',
          isVisible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400 text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-[-0.2px] text-foreground">
                {member && !isNew ? 'Team Member Details' : 'New Team Member'}
              </h2>
              {member && !isNew && (
                <p className="text-sm text-muted-foreground">
                  {displayName || `${firstName} ${lastName}`}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-[9px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-elegant p-5 space-y-5">
          {/* Status Badge (for existing members) */}
          {member && !isNew && (
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? 'green' : 'neutral'}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={roleBadgeVariants[role] || 'neutral'}>
                <RoleIcon className="w-3 h-3" />
                {roleLabels[role] || role}
              </Badge>
            </div>
          )}

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional nickname or preferred name"
            />
            <p className="text-xs text-muted-foreground">Optional. Defaults to first and last name.</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(512) 555-1234"
            />
          </div>

          {/* Role & Branch Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Role *
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ASSOCIATE">Associate</SelectItem>
                  <SelectItem value="CLIENT_USER">Client User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Branch
              </Label>
              <Select
                value={branchId || '__none__'}
                onValueChange={(v) => setBranchId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Status (for existing members) */}
          {member && !isNew && (
            <div className="flex items-center space-x-3 p-3 border border-border rounded-[12px] bg-secondary/40">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="isActive" className="font-medium text-foreground">
                  Active Member
                </Label>
                <p className="text-xs text-muted-foreground">
                  Inactive members cannot log in or access the platform
                </p>
              </div>
            </div>
          )}

          {/* Auth Account Section (for new members or setting password) */}
          {(!member || isNew) && (
            <div className="space-y-4 p-4 border border-border rounded-[12px] bg-secondary/40">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="createAuthAccount"
                  checked={createAuthAccount}
                  onCheckedChange={(checked) => setCreateAuthAccount(checked === true)}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="createAuthAccount" className="font-medium text-foreground">
                    Create Login Account
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow this user to log in to the platform
                  </p>
                </div>
              </div>

              {createAuthAccount && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                  />
                </div>
              )}
            </div>
          )}

          {/* Member Info (read-only for existing) */}
          {member && !isNew && member.createdAt && (
            <div className="pt-4 border-t border-border">
              <p className="font-mono text-xs text-muted-foreground">
                Member since {new Date(member.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </form>

        {/* Footer Actions - Fixed */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-card">
          {member && !isNew && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeactivateOpen(true)}
            >
              <UserX className="size-4" />
              Deactivate
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !firstName.trim() || !lastName.trim() || !email.trim()}
              variant="gold"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : member && !isNew ? (
                'Save Changes'
              ) : (
                'Add Member'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Deactivate confirmation — the only place red appears */}
      <AlertDialog open={confirmDeactivateOpen} onOpenChange={setConfirmDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate team member?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {displayName || `${firstName} ${lastName}`}
              </span>{' '}
              will no longer be able to log in or access the platform. Their history is
              preserved, and you can reactivate them anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmDeactivateOpen(false)
                handleDelete()
              }}
            >
              <UserX className="size-4" />
              Deactivate
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
