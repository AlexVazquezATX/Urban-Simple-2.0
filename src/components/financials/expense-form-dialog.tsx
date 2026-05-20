'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { EXPENSE_CATEGORIES, EXPENSE_TYPES } from '@/lib/financials'

interface ExpenseFormDialogProps {
  expense?: {
    id: string
    name: string
    category: string
    expenseType: string
    monthlyAmount: string | number
    vendor: string | null
    paymentMethod: string | null
    billingDay: number
    startDate: string
    endDate: string | null
    isActive: boolean
    notes: string | null
  } | null
  children: React.ReactNode
}

export function ExpenseFormDialog({ expense, children }: ExpenseFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState(expense?.name ?? '')
  const [category, setCategory] = useState(expense?.category ?? 'other')
  const [expenseType, setExpenseType] = useState(expense?.expenseType ?? 'operating')
  const [monthlyAmount, setMonthlyAmount] = useState(expense?.monthlyAmount?.toString() ?? '')
  const [vendor, setVendor] = useState(expense?.vendor ?? '')
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod ?? '')
  const [billingDay, setBillingDay] = useState(expense?.billingDay?.toString() ?? '1')
  const [startDate, setStartDate] = useState(
    expense?.startDate ? new Date(expense.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    expense?.endDate ? new Date(expense.endDate).toISOString().split('T')[0] : ''
  )
  const [isActive, setIsActive] = useState(expense?.isActive ?? true)
  const [notes, setNotes] = useState(expense?.notes ?? '')

  const handleOpenChange = (next: boolean) => {
    if (next && expense) {
      // Reset form to current expense values when reopening.
      setName(expense.name)
      setCategory(expense.category)
      setExpenseType(expense.expenseType)
      setMonthlyAmount(expense.monthlyAmount.toString())
      setVendor(expense.vendor ?? '')
      setPaymentMethod(expense.paymentMethod ?? '')
      setBillingDay(expense.billingDay.toString())
      setStartDate(new Date(expense.startDate).toISOString().split('T')[0])
      setEndDate(expense.endDate ? new Date(expense.endDate).toISOString().split('T')[0] : '')
      setIsActive(expense.isActive)
      setNotes(expense.notes ?? '')
    }
    setOpen(next)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const url = expense ? `/api/financials/expenses/${expense.id}` : '/api/financials/expenses'
      const method = expense ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          expenseType,
          monthlyAmount,
          vendor: vendor || null,
          paymentMethod: paymentMethod || null,
          billingDay,
          startDate,
          endDate: endDate || null,
          isActive,
          notes: notes || null,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to save expense')
      toast.success(expense ? 'Expense updated' : 'Expense added')
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Recurring Expense' : 'New Recurring Expense'}</DialogTitle>
          <DialogDescription>
            Track an ongoing monthly expense — rent, software, insurance, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="exp-name">Name *</Label>
            <Input id="exp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office rent" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-type">Expense Type</Label>
            <Select value={expenseType} onValueChange={setExpenseType}>
              <SelectTrigger id="exp-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-warm-500 dark:text-cream-400">
              Owner draws are distributions to the owners — kept out of operating profit.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="exp-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Monthly Amount *</Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-vendor">Vendor</Label>
              <Input id="exp-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. WeWork" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-method">Payment Method</Label>
              <Input id="exp-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="autopay, ach, credit_card..." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-billday">Billing Day</Label>
              <Input
                id="exp-billday"
                type="number"
                min="1"
                max="31"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-start">Start Date</Label>
              <Input id="exp-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-end">End Date</Label>
              <Input id="exp-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="exp-active" />
            <Label htmlFor="exp-active" className="text-sm">
              {isActive ? 'Active — counts toward overhead' : 'Paused — not counted'}
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-notes">Notes</Label>
            <Textarea
              id="exp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (optional)"
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving} className="rounded-sm">
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="rounded-sm">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              expense ? 'Update' : 'Add Expense'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
