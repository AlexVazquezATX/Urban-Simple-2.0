'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface SendReminderButtonProps {
  invoiceId: string
}

export function SendReminderButton({ invoiceId }: SendReminderButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleSendReminder = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminderType: 'auto',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send reminder')
      }

      const data = await response.json()
      toast.success('Payment reminder sent')
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSendReminder}
      disabled={loading}
    >
      <Mail className="mr-2 h-4 w-4" />
      {loading ? 'Sending...' : 'Remind'}
    </Button>
  )
}

