'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/image-upload'
import { EditableCard, Field } from '@/components/ui/editable-card'

interface EditableClientInfoProps {
  client: any
}

function buildForm(client: any) {
  return {
    name: client.name ?? '',
    legalName: client.legalName ?? '',
    logoUrl: client.logoUrl ?? '',
    billingEmail: client.billingEmail ?? '',
    phone: client.phone ?? '',
    paymentTerms: client.paymentTerms ?? 'NET_30',
    preferredPaymentMethod: client.preferredPaymentMethod ?? '',
    status: client.status ?? 'active',
    taxExempt: client.taxExempt ?? false,
    parentClientId: client.parentClientId ?? '',
    notes: client.notes ?? '',
  }
}

export function EditableClientInfo({ client }: EditableClientInfoProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => buildForm(client))
  const [parents, setParents] = useState<Array<{ id: string; name: string }>>([])
  const [parentsLoaded, setParentsLoaded] = useState(false)

  const set = (patch: Partial<ReturnType<typeof buildForm>>) =>
    setForm((f) => ({ ...f, ...patch }))

  const startEdit = () => {
    setForm(buildForm(client))
    setIsEditing(true)
    if (!parentsLoaded) {
      setParentsLoaded(true)
      fetch('/api/clients')
        .then((r) => (r.ok ? r.json() : []))
        .then((d) =>
          setParents(
            (Array.isArray(d) ? d : [])
              .filter((c: any) => c.id !== client.id)
              .map((c: any) => ({ id: c.id, name: c.name }))
          )
        )
        .catch(() => {})
    }
  }

  // Keep the current parent selectable before the candidate list loads.
  const parentOptions = useMemo(() => {
    const opts = [...parents]
    if (client.parentClient && !opts.some((o) => o.id === client.parentClient.id)) {
      opts.unshift({ id: client.parentClient.id, name: client.parentClient.name })
    }
    return opts
  }, [parents, client.parentClient])

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Client name is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          legalName: form.legalName,
          logoUrl: form.logoUrl || null,
          billingEmail: form.billingEmail,
          phone: form.phone,
          paymentTerms: form.paymentTerms,
          preferredPaymentMethod: form.preferredPaymentMethod || null,
          status: form.status,
          taxExempt: form.taxExempt,
          parentClientId: form.parentClientId || null,
          notes: form.notes,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update client')
      }
      toast.success('Client updated')
      setIsEditing(false)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <EditableCard
      title="Client Information"
      isEditing={isEditing}
      onEdit={startEdit}
      onCancel={() => setIsEditing(false)}
      onSave={save}
      saving={saving}
    >
      {isEditing ? (
        <div className="space-y-4">
          <Field label="Logo">
            <ImageUpload
              value={form.logoUrl || undefined}
              onChange={(v) => set({ logoUrl: v })}
              folder="clients"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client Name">
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Legal Name">
              <Input
                value={form.legalName}
                onChange={(e) => set({ legalName: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Billing Email">
              <Input
                type="email"
                value={form.billingEmail}
                onChange={(e) => set({ billingEmail: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <Field label="Preferred Payment Method">
              <Select
                value={form.preferredPaymentMethod || '__none__'}
                onValueChange={(v) =>
                  set({ preferredPaymentMethod: v === '__none__' ? '' : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set({ status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <label className="flex cursor-pointer items-center gap-2 self-end rounded-sm border border-warm-200 bg-warm-50/50 p-2.5 dark:border-charcoal-700 dark:bg-charcoal-800/50">
              <Checkbox
                checked={form.taxExempt}
                onCheckedChange={(c) => set({ taxExempt: c === true })}
              />
              <span className="text-sm text-warm-700 dark:text-cream-300">Tax exempt</span>
            </label>
          </div>
          <Field label="Parent Organization">
            <Select
              value={form.parentClientId || '__none__'}
              onValueChange={(v) => set({ parentClientId: v === '__none__' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None — standalone client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None — standalone client</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea
              className="resize-none"
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          {client.logoUrl && (
            <div className="relative h-32 w-full overflow-hidden rounded-sm border border-warm-200 bg-warm-50 dark:border-charcoal-700 dark:bg-charcoal-800">
              <Image
                src={client.logoUrl}
                alt={client.name}
                fill
                className="object-contain p-2"
                unoptimized
              />
            </div>
          )}
          <div>
            <p className="text-sm text-warm-500 dark:text-cream-400">Billing Email</p>
            <p className="font-medium text-warm-900 dark:text-cream-100">
              {client.billingEmail || '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-warm-500 dark:text-cream-400">Phone</p>
            <p className="font-medium text-warm-900 dark:text-cream-100">{client.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-warm-500 dark:text-cream-400">Payment Terms</p>
            <p className="font-medium text-warm-900 dark:text-cream-100">{client.paymentTerms}</p>
          </div>
          {client.preferredPaymentMethod && (
            <div>
              <p className="text-sm text-warm-500 dark:text-cream-400">Preferred Payment Method</p>
              <p className="font-medium capitalize text-warm-900 dark:text-cream-100">
                {client.preferredPaymentMethod.replace('_', ' ')}
              </p>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-warm-500 dark:text-cream-400">Status</p>
              <Badge
                className={`rounded-sm px-1.5 py-0 text-[10px] ${
                  client.status === 'active'
                    ? 'border-lime-200 bg-lime-100 text-lime-700'
                    : 'border-warm-200 bg-warm-100 text-warm-600'
                }`}
              >
                {client.status}
              </Badge>
            </div>
            {client.taxExempt && (
              <Badge
                variant="outline"
                className="rounded-sm border-warm-300 px-1.5 py-0 text-[10px] text-warm-600 dark:border-charcoal-700 dark:text-cream-400"
              >
                Tax Exempt
              </Badge>
            )}
          </div>
          {client.healthScore !== null && client.healthScore !== undefined && (
            <div>
              <p className="text-sm text-warm-500 dark:text-cream-400">Health Score</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-sm bg-warm-100 dark:bg-charcoal-800">
                  <div
                    className={`h-full ${
                      (client.healthScore || 0) >= 80
                        ? 'bg-lime-500'
                        : (client.healthScore || 0) >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${client.healthScore || 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-warm-700 dark:text-cream-300">
                  {client.healthScore}/100
                </span>
              </div>
            </div>
          )}
          {(client.loyaltyPoints > 0 || client.loyaltyTier !== 'bronze') && (
            <div>
              <p className="text-sm text-warm-500 dark:text-cream-400">Loyalty</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-sm border-warm-300 px-1.5 py-0 text-[10px] capitalize text-warm-600 dark:border-charcoal-700 dark:text-cream-400"
                >
                  {client.loyaltyTier}
                </Badge>
                <span className="text-sm text-warm-500 dark:text-cream-400">
                  {client.loyaltyPoints} points
                </span>
              </div>
            </div>
          )}
          {client.notes && (
            <div>
              <p className="text-sm text-warm-500 dark:text-cream-400">Notes</p>
              <p className="text-sm text-warm-700 dark:text-cream-300">{client.notes}</p>
            </div>
          )}
        </div>
      )}
    </EditableCard>
  )
}
