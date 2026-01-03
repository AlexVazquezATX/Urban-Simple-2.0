'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Mail, Loader2, Check } from 'lucide-react'

interface SendInvoiceDialogProps {
  invoiceId: string
  invoiceNumber: string
  defaultEmail?: string
  children?: React.ReactNode
}

export function SendInvoiceDialog({
  invoiceId,
  invoiceNumber,
  defaultEmail,
  children,
}: SendInvoiceDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(defaultEmail || '')
  const router = useRouter()

  const handleSend = async () => {
    if (!email) {
      toast.error('Please enter an email address')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: email }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invoice')
      }

      const data = await response.json()

      toast.success('Invoice sent successfully!', {
        description: `Sent ${invoiceNumber} to ${email}`,
        icon: <Check className="h-4 w-4" />,
      })

      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error('Failed to send invoice', {
        description: error.message || 'Please try again',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Send Invoice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Invoice</DialogTitle>
          <DialogDescription>
            Send {invoiceNumber} to your client via email
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The invoice will be sent as a professional PDF-style email
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading || !email}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
