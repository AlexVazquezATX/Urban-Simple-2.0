'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Records a financial snapshot for the current month on demand — same
// endpoint and flow as the Financials page's "Snapshot Now" button
// (POST /api/financials/snapshot, SUPER_ADMIN gated server-side).
export function SnapshotButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSnapshot = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/financials/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // defaults to current year/month server-side
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to capture snapshot')
      toast.success(`Captured snapshot for ${payload.periodYear}-${String(payload.periodMonth).padStart(2, '0')}`)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to capture snapshot')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleSnapshot} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
      {loading ? 'Capturing...' : 'Snapshot'}
    </Button>
  )
}
