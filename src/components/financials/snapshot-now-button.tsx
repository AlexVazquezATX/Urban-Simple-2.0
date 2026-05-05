'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Records a financial snapshot for the current month on demand. Useful for:
// - Backfilling history when there's no prior data (first time visiting the page)
// - Re-recording the current month after edits without waiting for the next cron tick
export function SnapshotNowButton() {
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to capture snapshot')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" className="rounded-sm" onClick={handleSnapshot} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Capturing...
        </>
      ) : (
        <>
          <Camera className="mr-2 h-4 w-4" />
          Snapshot Now
        </>
      )}
    </Button>
  )
}
