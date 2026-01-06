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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface GenerateInvoicesDialogProps {
  children: React.ReactNode
}

export function GenerateInvoicesDialog({
  children,
}: GenerateInvoicesDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [billingDay, setBillingDay] = useState(String(new Date().getDate()))
  const [targetDate, setTargetDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const router = useRouter()

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/billing/generate-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dryRun,
          billingDay: parseInt(billingDay),
          targetDate,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate invoices')
      }

      const data = await response.json()

      if (dryRun) {
        toast.info(
          data.message || `Preview: Would generate ${data.generated} invoice(s)`,
          {
            description: `Found ${data.total} service agreements for billing day ${billingDay}`,
            duration: 5000,
          }
        )
      } else {
        toast.success(
          data.message || `Generated ${data.generated} invoice(s)`,
          {
            description: `Processed ${data.total} service agreements`,
            duration: 5000,
          }
        )
        setOpen(false)
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Recurring Invoices</DialogTitle>
          <DialogDescription>
            Automatically generate invoices from active service agreements based on billing day
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billingDay">Billing Day</Label>
              <Input
                id="billingDay"
                type="number"
                min="1"
                max="28"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Day of month (1-28)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Date for invoice generation
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 rounded-md border p-3 bg-muted/50">
            <Checkbox
              id="dryRun"
              checked={dryRun}
              onCheckedChange={(checked) => setDryRun(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="dryRun"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Preview Mode (Dry Run)
              </label>
              <p className="text-xs text-muted-foreground">
                Preview which invoices would be generated without actually creating them
              </p>
            </div>
          </div>

          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
            <p className="text-blue-900 dark:text-blue-100">
              <strong>How it works:</strong> This will find all active service agreements with billing day {billingDay} and generate invoices for them.
              Invoices that already exist for this month will be skipped.
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
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {dryRun ? 'Previewing...' : 'Generating...'}
              </>
            ) : (
              <>{dryRun ? 'Preview Invoices' : 'Generate Invoices'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




