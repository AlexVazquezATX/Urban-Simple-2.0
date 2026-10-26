'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  MessageSquareText,
  Languages,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
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
import { useManagerLang } from '@/lib/i18n/use-manager-lang'
import { localeFor } from '@/lib/i18n/manager'

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
  smsAlerts?: boolean
  preferredLanguage?: string
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
  // Whether the current viewer may create/edit/deactivate members (admin-only
  // at the API). Defaults to true so existing callers keep their behavior.
  canManage?: boolean
  onClose: () => void
  onSave: (savedMember?: TeamMember) => void
  onDelete?: (memberId: string) => void
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
  canManage = true,
  onClose,
  onSave,
  onDelete,
}: TeamMemberDetailPanelProps) {
  const router = useRouter()
  const { lang, t } = useManagerLang()
  const p = t.team.panel
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false)
  // Whether this existing member already has a login (authId). null = unknown/loading.
  const [hasLogin, setHasLogin] = useState<boolean | null>(null)

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
  const [smsAlerts, setSmsAlerts] = useState(member?.smsAlerts ?? false)
  const [preferredLanguage, setPreferredLanguage] = useState(member?.preferredLanguage || 'en')

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
    setSmsAlerts(member?.smsAlerts ?? false)
    setPreferredLanguage(member?.preferredLanguage || 'en')
  }, [member])

  // For an existing member, look up whether they already have a login so we can
  // offer to provision one when they don't (A10).
  useEffect(() => {
    if (!member || isNew) {
      setHasLogin(null)
      return
    }
    let cancelled = false
    setHasLogin(null)
    fetch(`/api/users/${member.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setHasLogin(!!data.authId)
          if (typeof data.smsAlerts === 'boolean') setSmsAlerts(data.smsAlerts)
          if (data.preferredLanguage) setPreferredLanguage(data.preferredLanguage)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [member, isNew])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 200) // Wait for animation
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManage) return
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
        smsAlerts,
        preferredLanguage,
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
          throw new Error(error.error || p.toastUpdateFailed)
        }

        const savedMember = await response.json()
        toast.success(p.toastUpdated)
        onSave(savedMember)
        router.refresh()
      } else {
        // Create new member
        if (createAuthAccount && password) {
          payload.password = password
        } else if (createAuthAccount && !password) {
          throw new Error(p.toastPasswordRequired)
        }

        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || p.toastCreateFailed)
        }

        const savedMember = await response.json()
        toast.success(p.toastAdded)
        onSave(savedMember)
        router.refresh()
      }

      handleClose()
    } catch (error: any) {
      toast.error(error.message || p.toastGeneric)
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

  // Portal to <body>: inside the app shell a transformed/overflowing ancestor
  // turned `fixed` into "relative to that ancestor", parking the panel off the
  // right edge of the screen.
  if (typeof document === 'undefined') return null
  return createPortal(
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
                {member && !isNew ? p.detailsTitle : p.newTitle}
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
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status Badge (for existing members) */}
          {member && !isNew && (
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? 'green' : 'neutral'}>
                {isActive ? p.active : p.inactive}
              </Badge>
              <Badge variant={roleBadgeVariants[role] || 'neutral'}>
                <RoleIcon className="w-3 h-3" />
                {t.role[role] || role}
              </Badge>
            </div>
          )}

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{p.firstName}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{p.lastName}</Label>
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
            <Label htmlFor="displayName">{p.displayName}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={p.displayNamePlaceholder}
            />
            <p className="text-xs text-muted-foreground">{p.displayNameHint}</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {p.email}
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
              {p.phone}
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
                {p.role}
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t.role.ADMIN}</SelectItem>
                  <SelectItem value="MANAGER">{t.role.MANAGER}</SelectItem>
                  <SelectItem value="ASSOCIATE">{t.role.ASSOCIATE}</SelectItem>
                  <SelectItem value="CLIENT_USER">{t.role.CLIENT_USER}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {p.branch}
              </Label>
              <Select
                value={branchId || '__none__'}
                onValueChange={(v) => setBranchId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={p.selectBranch} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t.team.allBranches}</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Alerts + field language */}
          <div className="space-y-4 rounded-[12px] border border-border bg-secondary/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="smsAlerts" className="flex items-center gap-2 font-medium text-foreground">
                  <MessageSquareText className="w-4 h-4" />
                  {p.textAlerts}
                </Label>
                <p className="text-xs text-muted-foreground">{p.textAlertsHint}</p>
              </div>
              <Switch
                id="smsAlerts"
                checked={smsAlerts}
                onCheckedChange={setSmsAlerts}
                disabled={!canManage}
              />
            </div>
            {smsAlerts && !phone.trim() && (
              <p className="text-xs text-coral-600 dark:text-coral-300">{p.needPhone}</p>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Languages className="w-4 h-4" />
                {p.fieldLanguage}
              </Label>
              <Select value={preferredLanguage} onValueChange={setPreferredLanguage} disabled={!canManage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{p.fieldLanguageHint}</p>
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
                  {p.activeMember}
                </Label>
                <p className="text-xs text-muted-foreground">{p.activeMemberHint}</p>
              </div>
            </div>
          )}

          {/* Auth Account Section — for new members, and for existing members
              who don't yet have a login (A10). Admin-only. */}
          {canManage && (

            <div className="space-y-4 p-4 border border-border rounded-[12px] bg-secondary/40">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="createAuthAccount"
                  checked={createAuthAccount}
                  onCheckedChange={(checked) => setCreateAuthAccount(checked === true)}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="createAuthAccount" className="font-medium text-foreground">
                    {member && !isNew
                      ? hasLogin
                        ? p.setNewPassword
                        : p.addLogin
                      : p.createLogin}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {member && !isNew
                      ? hasLogin
                        ? p.setNewPasswordHint
                        : p.addLoginHint
                      : p.createLoginHint}
                  </p>
                </div>
              </div>

              {createAuthAccount && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    {p.password}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={p.passwordPlaceholder}
                  />
                </div>
              )}
            </div>
          )}

          {/* Member Info (read-only for existing) */}
          {member && !isNew && member.createdAt && (
            <div className="pt-4 border-t border-border">
              <p className="font-mono text-xs text-muted-foreground">
                {p.memberSince(new Date(member.createdAt).toLocaleDateString(localeFor(lang)))}
              </p>
            </div>
          )}
        </form>

        {/* Footer Actions - Fixed */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-card">
          {member && !isNew && onDelete && canManage ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDeactivateOpen(true)}
            >
              <UserX className="size-4" />
              {p.deactivate}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              {canManage ? t.common.cancel : t.common.close}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !canManage || loading || !firstName.trim() || !lastName.trim() || !email.trim()
              }
              title={canManage ? undefined : p.adminsOnly}
              variant="gold"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : member && !isNew ? (
                p.saveChanges
              ) : (
                p.addMember
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Deactivate confirmation — the only place red appears */}
      <AlertDialog open={confirmDeactivateOpen} onOpenChange={setConfirmDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{p.deactivateTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {displayName || `${firstName} ${lastName}`}
              </span>{' '}
              {p.deactivateBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmDeactivateOpen(false)
                handleDelete()
              }}
            >
              <UserX className="size-4" />
              {p.deactivate}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
    document.body
  )
}
