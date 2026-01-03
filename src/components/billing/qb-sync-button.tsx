'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface QBSyncButtonProps {
  invoiceId: string
  qbInvoiceId?: string | null
}

export function QBSyncButton({ invoiceId, qbInvoiceId }: QBSyncButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleSync = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/sync-qb`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sync to QuickBooks')
      }

      const data = await response.json()
      toast.success('Invoice synced to QuickBooks')
      
      // Refresh the page to show updated QB ID
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (qbInvoiceId) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          QB: {qbInvoiceId}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Re-sync
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={loading}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Syncing...' : 'Sync to QuickBooks'}
    </Button>
  )
}

