'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
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
import { EditableCard, Field, ViewRow } from '@/components/ui/editable-card'

interface EditableLocationInfoProps {
  location: any
}

function buildForm(location: any) {
  const addr = (location.address as Record<string, string>) || {}
  return {
    name: location.name ?? '',
    clientId: location.clientId ?? '',
    street: addr.street ?? '',
    city: addr.city ?? '',
    state: addr.state ?? '',
    zip: addr.zip ?? '',
    logoUrl: location.logoUrl ?? '',
    accessInstructions: location.accessInstructions ?? '',
    serviceNotes: location.serviceNotes ?? '',
    painPoints: location.painPoints ?? '',
    checklistTemplateId: location.checklistTemplateId ?? '',
    isActive: location.isActive ?? true,
  }
}

export function EditableLocationInfo({ location }: EditableLocationInfoProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => buildForm(location))
  const [clients, setClients] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  const set = (patch: Partial<ReturnType<typeof buildForm>>) =>
    setForm((f) => ({ ...f, ...patch }))

  const startEdit = () => {
    setForm(buildForm(location))
    setIsEditing(true)
    if (!optionsLoaded) {
      setOptionsLoaded(true)
      fetch('/api/clients')
        .then((r) => (r.ok ? r.json() : []))
        .then((d) =>
          setClients(Array.isArray(d) ? d.filter((c: any) => c.status === 'active') : [])
        )
        .catch(() => {})
      fetch('/api/checklists')
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setTemplates(Array.isArray(d) ? d.filter((t: any) => t.isActive) : []))
        .catch(() => {})
    }
  }

  // Always include the current client / template so the Select shows a value
  // even before the option lists finish loading (or if the current one is
  // inactive and filtered out of the fetch).
  const clientOptions = useMemo(() => {
    const opts = clients.map((c) => ({ id: c.id, name: c.name }))
    if (location.client && !opts.some((o) => o.id === location.client.id)) {
      opts.unshift({ id: location.client.id, name: location.client.name })
    }
    return opts
  }, [clients, location.client])

  const templateOptions = useMemo(() => {
    const opts = templates.map((t) => ({ id: t.id, name: t.name }))
    if (location.checklistTemplate && !opts.some((o) => o.id === location.checklistTemplate.id)) {
      opts.unshift({ id: location.checklistTemplate.id, name: location.checklistTemplate.name })
    }
    return opts
  }, [templates, location.checklistTemplate])

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Location name is required')
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
        },
        logoUrl: form.logoUrl || null,
        accessInstructions: form.accessInstructions,
        serviceNotes: form.serviceNotes,
        painPoints: form.painPoints,
        checklistTemplateId: form.checklistTemplateId || null,
        isActive: form.isActive,
      }
      // Only send clientId when it actually changed (reassignment).
      if (form.clientId && form.clientId !== location.clientId) {
        payload.clientId = form.clientId
      }
      const res = await fetch(`/api/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update location')
      }
      toast.success('Location updated')
      setIsEditing(false)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const addr = (location.address as Record<string, string>) || {}
  const addressStr = `${addr.street || ''} ${addr.city || ''} ${addr.state || ''} ${addr.zip || ''}`.trim()

  return (
    <EditableCard
      title="Location Information"
      isEditing={isEditing}
      onEdit={startEdit}
      onCancel={() => setIsEditing(false)}
      onSave={save}
      saving={saving}
    >
      {isEditing ? (
        <div className="space-y-4">
          <Field label="Logo / Image">
            <ImageUpload
              value={form.logoUrl || undefined}
              onChange={(v) => set({ logoUrl: v })}
              folder="locations"
            />
          </Field>
          <Field label="Location Name">
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Client">
            <Select value={form.clientId} onValueChange={(v) => set({ clientId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clientOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Address">
            <div className="grid grid-cols-2 gap-2">
              <Input
                className="col-span-2"
                placeholder="Street"
                value={form.street}
                onChange={(e) => set({ street: e.target.value })}
              />
              <Input
                placeholder="City"
                value={form.city}
                onChange={(e) => set({ city: e.target.value })}
              />
              <Input
                placeholder="State"
                value={form.state}
                onChange={(e) => set({ state: e.target.value })}
              />
              <Input
                placeholder="ZIP"
                value={form.zip}
                onChange={(e) => set({ zip: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Access Instructions">
            <Textarea
              className="resize-none"
              value={form.accessInstructions}
              onChange={(e) => set({ accessInstructions: e.target.value })}
            />
          </Field>
          <Field label="Service Notes">
            <Textarea
              className="resize-none"
              value={form.serviceNotes}
              onChange={(e) => set({ serviceNotes: e.target.value })}
            />
          </Field>
          <Field label="Pain Points">
            <Textarea
              className="resize-none"
              value={form.painPoints}
              onChange={(e) => set({ painPoints: e.target.value })}
            />
          </Field>
          <Field label="Checklist Template">
            <Select
              value={form.checklistTemplateId || '__none__'}
              onValueChange={(v) => set({ checklistTemplateId: v === '__none__' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {templateOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-secondary/50 p-3">
            <Checkbox
              checked={form.isActive}
              onCheckedChange={(c) => set({ isActive: c === true })}
            />
            <span className="text-sm text-foreground">Active location</span>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {location.logoUrl && (
            <div className="relative h-64 w-full overflow-hidden rounded-[10px] border border-border bg-secondary">
              <Image
                src={location.logoUrl}
                alt={location.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          {addressStr && <ViewRow label="Address">{addressStr}</ViewRow>}
          {location.accessInstructions && (
            <div>
              <p className="text-sm text-muted-foreground">Access Instructions</p>
              <p className="text-sm text-foreground">
                {location.accessInstructions}
              </p>
            </div>
          )}
          {location.serviceNotes && (
            <div>
              <p className="text-sm text-muted-foreground">Service Notes</p>
              <p className="text-sm text-foreground">{location.serviceNotes}</p>
            </div>
          )}
          {location.painPoints && (
            <div>
              <p className="text-sm text-muted-foreground">Pain Points</p>
              <p className="text-sm text-coral-600 dark:text-coral-300">{location.painPoints}</p>
            </div>
          )}
          <div>
            <Badge variant={location.isActive ? 'green' : 'neutral'}>
              {location.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {location.checklistTemplate ? (
            <div className="rounded-[10px] border border-border bg-secondary/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Assigned Checklist</p>
                    <p className="text-xs text-muted-foreground">{location.checklistTemplate.name}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/operations/checklists/${location.checklistTemplate.id}`}>
                    View Checklist
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[10px] border border-border bg-secondary/50 p-3">
              <p className="text-sm text-muted-foreground">
                No checklist assigned. Use Edit to assign one.
              </p>
            </div>
          )}
        </div>
      )}
    </EditableCard>
  )
}
