'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Route } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface DispatchGenerateButtonProps {
  rangeStart: string
}

export function DispatchGenerateButton({ rangeStart }: DispatchGenerateButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)

    try {
      const start = new Date(`${rangeStart}T00:00:00`)
      const end = addDays(start, 6)

      const response = await fetch('/api/operations/dispatch/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rangeStart: start.toISOString(),
          rangeEnd: end.toISOString(),
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate dispatch routes')
      }

      const skippedSummary =
        Array.isArray(payload.skippedLocations) && payload.skippedLocations.length > 0
          ? ` ${payload.skippedLocations.length} location${payload.skippedLocations.length === 1 ? '' : 's'} still need setup.`
          : ''

      toast.success(
        `Dispatch updated for ${format(start, 'MMM d')} - ${format(end, 'MMM d')}. ${payload.createdRoutes} route${payload.createdRoutes === 1 ? '' : 's'} created, ${payload.updatedRoutes} updated.${skippedSummary}`
      )
      router.refresh()
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate dispatch routes'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={loading} variant="outline" className="rounded-sm">
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Routes...
        </>
      ) : (
        <>
          <Route className="mr-2 h-4 w-4" />
          Generate Dispatch
        </>
      )}
    </Button>
  )
}
