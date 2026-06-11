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
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-gold-600/30 bg-gold-100 px-4 py-2 shadow-elevated">
        <Eye className="h-3.5 w-3.5 text-gold-700" />
        <span className="text-xs font-medium text-gold-800">
          Viewing as <span className="font-semibold">{clientName}</span>
        </span>
        <button
          type="button"
          onClick={handleExit}
          disabled={busy}
          className="ml-1 inline-flex items-center gap-1 rounded-full border border-gold-600/30 bg-card px-2.5 py-1 text-[11px] font-semibold text-gold-800 hover:bg-gold-50 disabled:opacity-60"
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
