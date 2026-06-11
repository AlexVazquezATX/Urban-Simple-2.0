'use client'

// Quick-edit modal for the four financial fields on a single ServiceAgreement.
// Lighter than the full ServiceAgreementForm: drops client/location/dates,
// shows the live profit and margin so you see the impact while typing.
// Used inline from the per-location row in ClientFinancialsBlock.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMargin } from '@/lib/financials'
import { formatMoney } from '@/lib/format'
import { marginToneClass } from './margin-tone'

interface FinancialsQuickEditDialogProps {
  agreementId: string
  locationName: string
  initial: {
    monthlyAmount: number
    monthlyLaborCost: number | null
    monthlyMaterialCost: number | null
    monthlyOtherCost: number | null
  }
}

function num(s: string): number {
  const n = parseFloat(s || '0')
  return Number.isFinite(n) ? n : 0
}

export function FinancialsQuickEditDialog({
  agreementId,
  locationName,
  initial,
}: FinancialsQuickEditDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [revenue, setRevenue] = useState(initial.monthlyAmount.toString())
  const [labor, setLabor] = useState(initial.monthlyLaborCost?.toString() ?? '')
  const [material, setMaterial] = useState(initial.monthlyMaterialCost?.toString() ?? '')
  const [other, setOther] = useState(initial.monthlyOtherCost?.toString() ?? '')

  const liveRevenue = num(revenue)
  const liveCost = num(labor) + num(material) + num(other)
  const liveProfit = liveRevenue - liveCost
  const liveMargin = liveRevenue > 0 ? (liveProfit / liveRevenue) * 100 : null

  const handleSave = async () => {
    if (!revenue || liveRevenue < 0) {
      toast.error('Monthly revenue must be a non-negative number')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/service-agreements/${agreementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyAmount: liveRevenue,
          monthlyLaborCost: labor === '' ? null : num(labor),
          monthlyMaterialCost: material === '' ? null : num(material),
          monthlyOtherCost: other === '' ? null : num(other),
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to save')
      }
      toast.success(`Updated financials for ${locationName}`)
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Reset form on open so a stale typed-but-cancelled state doesn't carry over.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setRevenue(initial.monthlyAmount.toString())
      setLabor(initial.monthlyLaborCost?.toString() ?? '')
      setMaterial(initial.monthlyMaterialCost?.toString() ?? '')
      setOther(initial.monthlyOtherCost?.toString() ?? '')
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Financials</DialogTitle>
          <DialogDescription>{locationName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qe-revenue" className="text-xs">Monthly Revenue</Label>
            <Input
              id="qe-revenue"
              type="number"
              step="0.01"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="qe-labor" className="text-xs">Labor</Label>
              <Input
                id="qe-labor"
                type="number"
                step="0.01"
                value={labor}
                onChange={(e) => setLabor(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qe-material" className="text-xs">Materials</Label>
              <Input
                id="qe-material"
                type="number"
                step="0.01"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qe-other" className="text-xs">Other</Label>
              <Input
                id="qe-other"
                type="number"
                step="0.01"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[10px] border border-border bg-secondary/40 p-2.5 text-xs">
            <div>
              <p className="kicker text-muted-foreground">Total Cost</p>
              <p className="font-mono font-medium tabular-nums text-foreground">{formatMoney(liveCost)}</p>
            </div>
            <div>
              <p className="kicker text-muted-foreground">Profit</p>
              <p className={`font-mono font-medium tabular-nums ${marginToneClass(liveMargin)}`}>
                {formatMoney(liveProfit)}
              </p>
            </div>
            <div>
              <p className="kicker text-muted-foreground">Margin</p>
              <p className={`font-mono font-medium tabular-nums ${marginToneClass(liveMargin)}`}>
                {formatMargin(liveMargin)}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
