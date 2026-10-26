'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GenerateShiftsButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    try {
      const res = await fetch('/api/operations/associate-shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 14 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate shifts')
      toast.success(
        `Created ${data.created} shift${data.created === 1 ? '' : 's'} for the next 14 nights` +
          (data.skippedIncomplete ? `. ${data.skippedIncomplete} assignment(s) need nights and hours first.` : '.')
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate shifts')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="gold" className="gap-1.5" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
      Fill crew shifts (14 nights)
    </Button>
  )
}
