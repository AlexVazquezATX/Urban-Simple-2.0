'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Route } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface DispatchCreateRouteButtonProps {
  locationId: string
  date: string
  locationLabel: string
}

export function DispatchCreateRouteButton({
  locationId,
  date,
  locationLabel,
}: DispatchCreateRouteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCreateRoute = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/operations/dispatch/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId,
          date,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create manager route')
      }

      const actionLabel =
        payload.action === 'created'
          ? 'Created route'
          : payload.action === 'updated'
            ? 'Updated route'
            : 'Route already existed'

      toast.success(`${actionLabel} for ${locationLabel}.`)
      router.refresh()
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create manager route'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mt-2 h-7 rounded-sm px-2 text-xs"
      onClick={handleCreateRoute}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <Route className="mr-1 h-3 w-3" />
          Create Route
        </>
      )}
    </Button>
  )
}
