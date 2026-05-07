'use client'

import { useState } from 'react'
import { Eye, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Floating "Viewing as <client> · Exit" pill shown to a SUPER_ADMIN who is
// impersonating a CLIENT_USER. The portal layout itself is built around real
// portal users, so this is the only path back to the admin app from within
// /portal/*. Clicking Exit clears the impersonation cookie and full-reloads
// to /dashboard.

interface Props {
  clientName: string
}

export function ImpersonationExitPill({ clientName }: Props) {
  const [busy, setBusy] = useState(false)

  const handleExit = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/dev/switch-role', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to exit impersonation')
      }
      sessionStorage.removeItem('user-role')
      sessionStorage.removeItem('user-real-role')
      window.location.href = '/dashboard'
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to exit'
      toast.error(msg)
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 md:bottom-6">
      <div className="flex items-center gap-2 rounded-sm border-2 border-amber-300 bg-amber-50 px-3 py-1.5 shadow-lg">
        <Eye className="h-3.5 w-3.5 text-amber-700" />
        <span className="text-xs font-medium text-amber-900">
          Viewing as <span className="font-semibold">{clientName}</span>
        </span>
        <button
          type="button"
          onClick={handleExit}
          disabled={busy}
          className="ml-1 inline-flex items-center gap-1 rounded-sm border border-amber-400 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
          Exit
        </button>
      </div>
    </div>
  )
}
