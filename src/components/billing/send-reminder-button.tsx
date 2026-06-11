'use client'

import { useState } from 'react'
import { Mail, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface SendReminderButtonProps {
  invoiceId: string
}

/**
 * Row-level kebab holding the payment-reminder action — per the table
 * rules, secondary row actions live behind the kebab, never inline.
 */
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={loading}
          aria-label="More actions"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSendReminder} disabled={loading}>
          <Mail className="size-4" />
          {loading ? 'Sending reminder...' : 'Send payment reminder'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
