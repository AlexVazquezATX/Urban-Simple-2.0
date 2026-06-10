'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface QboStatus {
  configured: boolean
  connected: boolean
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastSyncError: string | null
  reconnectNeeded: boolean
}

export function QboConnectionCard() {
  const [status, setStatus] = useState<QboStatus | null>(null)
  const [syncing, setSyncing] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/qbo/status')
      if (res.ok) setStatus(await res.json())
    } catch {
      // Card stays hidden when status cannot be loaded.
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/qbo/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      toast.success(
        `QuickBooks sync complete: ${data.invoicesCreated} new, ${data.invoicesUpdated} updated, ${data.paymentsCreated} payments`
      )
      await loadStatus()
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sync failed')
      await loadStatus()
    } finally {
      setSyncing(false)
    }
  }

  if (!status || !status.configured) return null

  return (
    <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status.connected && !status.reconnectNeeded
                ? status.lastSyncStatus === 'error'
                  ? 'bg-yellow-500'
                  : 'bg-lime-500'
                : 'bg-warm-300 dark:bg-charcoal-600'
            }`}
          />
          <div>
            <p className="text-sm font-medium text-warm-900 dark:text-cream-100">
              {status.connected
                ? status.reconnectNeeded
                  ? 'QuickBooks connection expired'
                  : 'QuickBooks connected'
                : 'QuickBooks not connected'}
            </p>
            <p className="text-xs text-warm-500 dark:text-cream-400">
              {status.lastSyncStatus === 'error' && status.lastSyncError
                ? `Last sync failed: ${status.lastSyncError}`
                : status.lastSyncAt
                  ? `Last synced ${new Date(status.lastSyncAt).toLocaleString()}`
                  : 'Invoices and payments will mirror from QuickBooks after the first sync'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status.connected && !status.reconnectNeeded ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync now'}
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="rounded-sm" asChild>
              <a href="/api/qbo/connect">
                <Link2 className="mr-2 h-4 w-4" />
                {status.reconnectNeeded ? 'Reconnect QuickBooks' : 'Connect QuickBooks'}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
