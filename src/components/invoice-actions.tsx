'use client'

import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function MarkAsSentButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()

  const handleMarkAsSent = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'sent',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update invoice')
      }

      toast.success('Invoice marked as sent')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    }
  }

  return (
    <Button onClick={handleMarkAsSent} size="sm">
      <Send className="mr-2 h-4 w-4" />
      Mark as Sent
    </Button>
  )
}




