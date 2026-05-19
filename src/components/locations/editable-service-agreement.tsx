'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EditableCard, Field } from '@/components/ui/editable-card'
import { formatCurrency, formatMargin, marginToneClass } from '@/lib/financials'
import { cn } from '@/lib/utils'

interface AgreementData {
  id: string
  description: string
  monthlyAmount: number
  monthlyLaborCost: number | null
  monthlyMaterialCost: number | null
  monthlyOtherCost: number | null
  billingDay: number
  paymentTerms: string
  startDate: string // ISO
  endDate: string | null // ISO
}

interface EditableServiceAgreementProps {
  locationId: string
  clientId: string
  agreement: AgreementData | null
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function buildForm(a: AgreementData | null) {
  return {
    description: a?.description ?? '',
    monthlyAmount: a ? String(a.monthlyAmount) : '',
    monthlyLaborCost: a?.monthlyLaborCost != null ? String(a.monthlyLaborCost) : '',
    monthlyMaterialCost: a?.monthlyMaterialCost != null ? String(a.monthlyMaterialCost) : '',
    monthlyOtherCost: a?.monthlyOtherCost != null ? String(a.monthlyOtherCost) : '',
    billingDay: a ? String(a.billingDay) : '1',
    paymentTerms: a?.paymentTerms ?? 'NET_30',
    startDate: a?.startDate ? a.startDate.split('T')[0] : todayISO(),
    endDate: a?.endDate ? a.endDate.split('T')[0] : '',
  }
}

function Tile({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-sm border border-warm-200 bg-warm-50/50 p-3 dark:border-charcoal-700 dark:bg-charcoal-900/40">
      <p className="text-[10px] font-medium uppercase tracking-wider text-warm-500 dark:text-cream-400">
        {label}
      </p>
      <p className={cn('mt-1 font-mono font-medium text-warm-900 dark:text-cream-100', valueClass)}>
        {value}
      </p>
    </div>
  )
}

export function EditableServiceAgreement({
  locationId,
  clientId,
  agreement,
}: EditableServiceAgreementProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => buildForm(agreement))

  const set = (patch: Partial<ReturnType<typeof buildForm>>) =>
    setForm((f) => ({ ...f, ...patch }))

  const startEdit = () => {
    setForm(buildForm(agreement))
    setIsEditing(true)
  }

  const save = async () => {
    if (!form.description.trim()) {
      toast.error('A description is required')
      return
    }
    const amount = parseFloat(form.monthlyAmount)
    if (!form.monthlyAmount.trim() || Number.isNaN(amount)) {
      toast.error('Monthly revenue is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        clientId,
        locationId,
        description: form.description.trim(),
        monthlyAmount: form.monthlyAmount,
        monthlyLaborCost: form.monthlyLaborCost.trim() === '' ? null : form.monthlyLaborCost,
        monthlyMaterialCost: form.monthlyMaterialCost.trim() === '' ? null : form.monthlyMaterialCost,
        monthlyOtherCost: form.monthlyOtherCost.trim() === '' ? null : form.monthlyOtherCost,
        billingDay: form.billingDay,
        paymentTerms: form.paymentTerms,
        startDate: form.startDate,
        endDate: form.endDate || null,
      }
      const res = await fetch(
        agreement ? `/api/service-agreements/${agreement.id}` : '/api/service-agreements',
        {
          method: agreement ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save financial details')
      }
      toast.success(agreement ? 'Financials updated' : 'Financials added')
      setIsEditing(false)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  // Live P&L readout while editing.
  const liveRevenue = parseFloat(form.monthlyAmount) || 0
  const liveCost =
    (parseFloat(form.monthlyLaborCost) || 0) +
    (parseFloat(form.monthlyMaterialCost) || 0) +
    (parseFloat(form.monthlyOtherCost) || 0)
  const liveProfit = liveRevenue - liveCost
  const liveMargin = liveRevenue > 0 ? (liveProfit / liveRevenue) * 100 : null

  // P&L for the view state.
  const revenue = agreement?.monthlyAmount ?? 0
  const cost =
    (agreement?.monthlyLaborCost ?? 0) +
    (agreement?.monthlyMaterialCost ?? 0) +
    (agreement?.monthlyOtherCost ?? 0)
  const profit = revenue - cost
  const margin = revenue > 0 ? (profit / revenue) * 100 : null

  return (
    <EditableCard
      title="Financials"
      isEditing={isEditing}
      onEdit={startEdit}
      onCancel={() => setIsEditing(false)}
      onSave={save}
      saving={saving}
      editLabel={agreement ? 'Edit' : 'Add financial details'}
    >
      {isEditing ? (
        <div className="space-y-4">
          <Field label="Description">
            <Input
              placeholder="Nightly cleaning service"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly Revenue">
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.monthlyAmount}
                onChange={(e) => set({ monthlyAmount: e.target.value })}
              />
            </Field>
            <Field label="Billing Day">
              <Select value={form.billingDay} onValueChange={(v) => set({ billingDay: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="space-y-3 rounded-sm border border-warm-200 p-3 dark:border-charcoal-700">
            <p className="text-[10px] font-medium uppercase tracking-wider text-warm-500 dark:text-cream-400">
              Operational costs — optional, profit calculates live
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Labor">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.monthlyLaborCost}
                  onChange={(e) => set({ monthlyLaborCost: e.target.value })}
                />
              </Field>
              <Field label="Materials">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.monthlyMaterialCost}
                  onChange={(e) => set({ monthlyMaterialCost: e.target.value })}
                />
              </Field>
              <Field label="Other">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.monthlyOtherCost}
                  onChange={(e) => set({ monthlyOtherCost: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-sm bg-warm-50/60 p-2 dark:bg-charcoal-900/40">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">
                  Total Cost
                </p>
                <p className="font-mono text-sm font-medium text-warm-900 dark:text-cream-100">
                  {formatCurrency(liveCost)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">
                  Profit
                </p>
                <p className={cn('font-mono text-sm font-medium', marginToneClass(liveMargin))}>
                  {formatCurrency(liveProfit)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">
                  Margin
                </p>
                <p className={cn('font-mono text-sm font-medium', marginToneClass(liveMargin))}>
                  {formatMargin(liveMargin)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Payment Terms">
              <Select value={form.paymentTerms} onValueChange={(v) => set({ paymentTerms: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NET_15">Net 15</SelectItem>
                  <SelectItem value="NET_30">Net 30</SelectItem>
                  <SelectItem value="DUE_ON_RECEIPT">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Start Date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
              />
            </Field>
            <Field label="End Date (optional)">
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set({ endDate: e.target.value })}
              />
            </Field>
          </div>
        </div>
      ) : agreement ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Monthly Revenue" value={formatCurrency(revenue)} />
            <Tile label="Monthly Cost" value={formatCurrency(cost)} />
            <Tile
              label="Monthly Profit"
              value={formatCurrency(profit)}
              valueClass={marginToneClass(margin)}
            />
            <Tile
              label="Margin"
              value={formatMargin(margin)}
              valueClass={marginToneClass(margin)}
            />
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-warm-500 dark:text-cream-400">Description</span>
              <span className="text-right font-medium text-warm-900 dark:text-cream-100">
                {agreement.description}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-warm-500 dark:text-cream-400">Billing Day</span>
              <span className="font-medium text-warm-900 dark:text-cream-100">
                Day {agreement.billingDay}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-warm-500 dark:text-cream-400">Payment Terms</span>
              <span className="font-medium text-warm-900 dark:text-cream-100">
                {agreement.paymentTerms.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-warm-500 dark:text-cream-400">Start Date</span>
              <span className="font-medium text-warm-900 dark:text-cream-100">
                {new Date(agreement.startDate).toLocaleDateString()}
              </span>
            </div>
            {agreement.endDate && (
              <div className="flex justify-between gap-4">
                <span className="text-warm-500 dark:text-cream-400">End Date</span>
                <span className="font-medium text-warm-900 dark:text-cream-100">
                  {new Date(agreement.endDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-warm-500 dark:text-cream-400">
          No financial details yet. Add this location&apos;s monthly charge and your labor,
          material, and other costs to track its profit and margin — use{' '}
          <span className="font-medium text-warm-700 dark:text-cream-300">
            Add financial details
          </span>{' '}
          above.
        </p>
      )}
    </EditableCard>
  )
}
