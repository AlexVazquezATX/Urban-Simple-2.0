'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, User, Users, Briefcase, Building2, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

// SUPER_ADMIN-only dev tool: impersonate any role to test the experience.
// The previous version of this component flipped the user's actual DB role,
// which permanently downgraded the owner account on every "switch." This
// version writes a server-side cookie that auth helpers honor as a role
// override — the real role is never touched, so a wrong click can always
// be undone with one tap.

interface RoleSwitcherProps {
  currentRole: string // effective role (what the app is treating you as right now)
  realRole: string // actual DB role — only SUPER_ADMIN sees this component
  impersonating: boolean
  impersonatedClientId: string | null
}

interface ImpersonableClient {
  id: string
  name: string
  isSelfServe: boolean
}

const ROLE_ICONS = {
  SUPER_ADMIN: Shield,
  ADMIN: Briefcase,
  MANAGER: Users,
  ASSOCIATE: User,
  CLIENT_USER: Building2,
} as const

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin (you)',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ASSOCIATE: 'Associate',
  CLIENT_USER: 'Client User',
} as const

type RoleKey = keyof typeof ROLE_LABELS

export function RoleSwitcher({
  currentRole,
  realRole,
  impersonating,
  impersonatedClientId,
}: RoleSwitcherProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [clients, setClients] = useState<ImpersonableClient[] | null>(null)
  const [pendingClientId, setPendingClientId] = useState<string>(impersonatedClientId || '')

  // Lazy-load the client list the first time the picker opens. Hook stays
  // above the early-return below so React's hook order is stable across
  // renders (rules-of-hooks).
  useEffect(() => {
    if (!pickerOpen || clients !== null) return
    let cancelled = false
    fetch('/api/dev/impersonable-clients', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (!cancelled) setClients(data.clients || [])
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load clients')
          setClients([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [pickerOpen, clients])

  // Only render for users whose REAL role is SUPER_ADMIN. The effective role
  // can be anything during impersonation — that's fine, we still want the
  // dropdown visible so the user can get back to themselves.
  if (realRole !== 'SUPER_ADMIN') return null

  const applyImpersonation = async (role: string, clientId?: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/dev/switch-role', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, clientId }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to switch role')
      }
      // Clear the cached role from sessionStorage so layout-wrapper refetches.
      sessionStorage.removeItem('user-role')
      // Full reload guarantees every cached server component re-renders with
      // the impersonated role applied (no half-applied UI).
      const target = role === 'CLIENT_USER' ? '/portal' : '/'
      window.location.href = target
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to switch role'
      toast.error(msg)
      setIsLoading(false)
    }
  }

  const handleRoleSelect = (newRole: string) => {
    if (newRole === currentRole && !impersonating) return
    if (newRole === 'CLIENT_USER') {
      setPickerOpen(true)
      return
    }
    applyImpersonation(newRole)
  }

  const handlePickClient = () => {
    if (!pendingClientId) {
      toast.error('Pick a client to impersonate')
      return
    }
    applyImpersonation('CLIENT_USER', pendingClientId)
  }

  const exitImpersonation = () => applyImpersonation('SUPER_ADMIN')

  const CurrentIcon = ROLE_ICONS[currentRole as RoleKey] || User

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={
          impersonating
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-lime-100 text-lime-800 border-lime-300'
        }
      >
        {impersonating ? 'Impersonating' : 'Dev Mode'}
      </Badge>

      <Select
        value={currentRole}
        onValueChange={handleRoleSelect}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[190px] bg-white border-lime-300 dark:bg-charcoal-900 dark:border-lime-700">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CurrentIcon className="h-4 w-4" />
            )}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(ROLE_LABELS) as [RoleKey, string][]).map(([value, label]) => {
            const Icon = ROLE_ICONS[value]
            return (
              <SelectItem key={value} value={value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {impersonating && (
        <Button
          size="sm"
          variant="outline"
          onClick={exitImpersonation}
          disabled={isLoading}
          className="h-9 border-amber-300 text-amber-800 hover:bg-amber-50"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Exit
        </Button>
      )}

      {/* Client picker: only renders when CLIENT_USER is being chosen. Using
          a portaled overlay rather than a Dialog keeps this component small
          and avoids importing yet another shadcn primitive. */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false)
          }}
        >
          <div className="w-full max-w-md rounded-sm border border-warm-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-warm-500">
                  Impersonate
                </p>
                <h3 className="mt-1 text-base font-medium text-warm-900">View portal as a client</h3>
                <p className="mt-0.5 text-xs text-warm-500">
                  Pick a client to load their portal exactly the way they see it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-sm p-1 text-warm-500 hover:bg-warm-100 hover:text-warm-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              {clients === null ? (
                <div className="flex items-center justify-center py-8 text-sm text-warm-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading clients…
                </div>
              ) : clients.length === 0 ? (
                <p className="py-6 text-center text-sm text-warm-500">
                  No active clients to impersonate.
                </p>
              ) : (
                <div className="max-h-72 space-y-1 overflow-y-auto rounded-sm border border-warm-200 p-1">
                  {clients.map((c) => (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center justify-between rounded-sm px-2.5 py-2 text-sm hover:bg-warm-50 ${
                        pendingClientId === c.id ? 'bg-lime-50' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="impersonate-client"
                          value={c.id}
                          checked={pendingClientId === c.id}
                          onChange={() => setPendingClientId(c.id)}
                          className="accent-lime-600"
                        />
                        <span className="text-warm-900">{c.name}</span>
                      </span>
                      {c.isSelfServe && (
                        <span className="rounded-sm bg-plum-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-plum-700">
                          Self-serve
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPickerOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePickClient}
                disabled={isLoading || !pendingClientId}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Switching…
                  </>
                ) : (
                  'View as this client'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
