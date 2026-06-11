'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Mail, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  clientId: string
  contactId: string
  contactEmail: string | null
  isPortalUser: boolean
}

export function PortalInviteButton({ clientId, contactId, contactEmail, isPortalUser }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleInvite = async () => {
    if (!contactEmail) {
      toast.error('Add an email to this contact first.')
      return
    }
    const verb = isPortalUser ? 'Re-send portal invite' : 'Send portal invite'
    if (!window.confirm(`${verb} to ${contactEmail}?`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/portal-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to send invite')
      toast.success(isPortalUser ? 'Re-sent portal invite' : 'Portal invite sent')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleInvite}
      disabled={loading || !contactEmail}
      title={isPortalUser ? 'Re-send portal invite' : 'Send portal invite'}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPortalUser ? (
        <MailCheck className="h-4 w-4" />
      ) : (
        <Mail className="h-4 w-4" />
      )}
    </Button>
  )
}
