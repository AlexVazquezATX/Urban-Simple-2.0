'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EditableCard, Field } from '@/components/ui/editable-card'
import {
  SERVICE_CADENCE_OPTIONS,
  SERVICE_DAY_OPTIONS,
  formatServiceDays,
  normalizeServiceProfile,
} from '@/lib/operations/dispatch'

interface EditableDispatchProfileProps {
  location: any
}

function buildForm(location: any) {
  const p = normalizeServiceProfile(location.serviceProfile)
  return {
    cadence: p.cadence,
    serviceDays: p.serviceDays as number[],
    preferredStartTime: p.preferredStartTime || '',
    preferredEndTime: p.preferredEndTime || '',
    estimatedDurationMins: String(p.estimatedDurationMins),
    defaultManagerId: p.defaultManagerId || '',
    routePriority: String(p.routePriority),
    autoSchedule: p.autoSchedule,
    reviewRequired: p.reviewRequired,
    dispatchNotes: p.dispatchNotes || '',
  }
}

export function EditableDispatchProfile({ location }: EditableDispatchProfileProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => buildForm(location))
  const [managers, setManagers] = useState<any[]>([])
  const [managersLoaded, setManagersLoaded] = useState(false)

  const set = (patch: Partial<ReturnType<typeof buildForm>>) =>
    setForm((f) => ({ ...f, ...patch }))

  const startEdit = () => {
    setForm(buildForm(location))
    setIsEditing(true)
    if (!managersLoaded) {
      setManagersLoaded(true)
      fetch('/api/users?role=MANAGER')
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => {
          const users = Array.isArray(d) ? d : d.users || []
          setManagers(users.filter((m: any) => m.isActive))
        })
        .catch(() => {})
    }
  }

  // Keep the current manager selectable even before the list loads.
  const managerOptions = useMemo(() => {
    const opts = managers.map((m) => ({
      id: m.id,
      name: m.displayName || `${m.firstName} ${m.lastName}`,
    }))
    const cur = location.serviceProfile?.defaultManager
    if (cur && !opts.some((o) => o.id === cur.id)) {
      opts.unshift({
        id: cur.id,
        name: cur.displayName || `${cur.firstName} ${cur.lastName}`,
      })
    }
    return opts
  }, [managers, location.serviceProfile])

  const toggleDay = (day: number, checked: boolean) => {
    setForm((f) => ({
      ...f,
      serviceDays: checked
        ? [...f.serviceDays, day].sort((a, b) => a - b)
        : f.serviceDays.filter((d) => d !== day),
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceProfile: {
            cadence: form.cadence,
            serviceDays: form.serviceDays,
            preferredStartTime: form.preferredStartTime || null,
            preferredEndTime: form.preferredEndTime || null,
            estimatedDurationMins: Number(form.estimatedDurationMins) || 120,
            defaultManagerId: form.defaultManagerId || null,
            routePriority: Number(form.routePriority) || 50,
            autoSchedule: form.autoSchedule,
            reviewRequired: form.reviewRequired,
            dispatchNotes: form.dispatchNotes || null,
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update dispatch profile')
      }
      toast.success('Dispatch profile updated')
      setIsEditing(false)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const view = normalizeServiceProfile(location.serviceProfile)
  const managerName = location.serviceProfile?.defaultManager
    ? location.serviceProfile.defaultManager.displayName ||
      `${location.serviceProfile.defaultManager.firstName} ${location.serviceProfile.defaultManager.lastName}`
    : 'Unassigned'

  return (
    <EditableCard
      title="Dispatch Profile"
      isEditing={isEditing}
      onEdit={startEdit}
      onCancel={() => setIsEditing(false)}
      onSave={save}
      saving={saving}
    >
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Service Cadence">
              <Select value={form.cadence} onValueChange={(v) => set({ cadence: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cadence" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CADENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default Review Manager">
              <Select
                value={form.defaultManagerId || '__none__'}
                onValueChange={(v) => set({ defaultManagerId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {managerOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Service Days">
            <div className="grid grid-cols-4 gap-2 rounded-sm border border-warm-200 bg-white p-3 dark:border-charcoal-700 dark:bg-charcoal-900">
              {SERVICE_DAY_OPTIONS.map((day) => (
                <div key={day.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={form.serviceDays.includes(day.value)}
                    onCheckedChange={(c) => toggleDay(day.value, c === true)}
                  />
                  <Label htmlFor={`day-${day.value}`} className="cursor-pointer text-sm font-normal">
                    {day.shortLabel}
                  </Label>
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              Route days: {formatServiceDays(form.serviceDays)}
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Window Start">
              <Input
                type="time"
                value={form.preferredStartTime}
                onChange={(e) => set({ preferredStartTime: e.target.value })}
              />
            </Field>
            <Field label="Window End">
              <Input
                type="time"
                value={form.preferredEndTime}
                onChange={(e) => set({ preferredEndTime: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Visit Duration (mins)">
              <Input
                type="number"
                min={15}
                max={720}
                value={form.estimatedDurationMins}
                onChange={(e) => set({ estimatedDurationMins: e.target.value })}
              />
            </Field>
            <Field label="Route Priority">
              <Input
                type="number"
                min={1}
                max={100}
                value={form.routePriority}
                onChange={(e) => set({ routePriority: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex cursor-pointer items-start gap-2 rounded-sm border border-warm-200 bg-white p-3 dark:border-charcoal-700 dark:bg-charcoal-900">
              <Checkbox
                checked={form.autoSchedule}
                onCheckedChange={(c) => set({ autoSchedule: c === true })}
              />
              <span className="text-sm text-warm-700 dark:text-cream-300">
                Auto-schedule manager route
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-sm border border-warm-200 bg-white p-3 dark:border-charcoal-700 dark:bg-charcoal-900">
              <Checkbox
                checked={form.reviewRequired}
                onCheckedChange={(c) => set({ reviewRequired: c === true })}
              />
              <span className="text-sm text-warm-700 dark:text-cream-300">
                Require manager review
              </span>
            </label>
          </div>

          <Field label="Dispatch Notes">
            <Textarea
              className="resize-none"
              value={form.dispatchNotes}
              onChange={(e) => set({ dispatchNotes: e.target.value })}
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-warm-900 dark:text-cream-100">Cadence</p>
            <Badge
              variant="outline"
              className="rounded-sm border-warm-300 px-1.5 py-0 text-[10px] capitalize text-warm-600"
            >
              {view.cadence}
            </Badge>
          </div>
          <p className="text-xs text-warm-500 dark:text-cream-400">
            Service days: {formatServiceDays(view.serviceDays)}
          </p>
          <p className="text-xs text-warm-500 dark:text-cream-400">
            Window: {view.preferredStartTime || '--'} - {view.preferredEndTime || '--'}
          </p>
          <p className="text-xs text-warm-500 dark:text-cream-400">
            Default manager: {managerName}
          </p>
          <p className="text-xs text-warm-500 dark:text-cream-400">
            Route priority: {view.routePriority} • Duration: {view.estimatedDurationMins} mins
          </p>
          <p className="text-xs text-warm-500 dark:text-cream-400">
            Auto-schedule: {view.autoSchedule ? 'On' : 'Off'} • Review required:{' '}
            {view.reviewRequired ? 'Yes' : 'No'}
          </p>
          {view.dispatchNotes && (
            <p className="text-xs text-warm-600 dark:text-cream-300">{view.dispatchNotes}</p>
          )}
        </div>
      )}
    </EditableCard>
  )
}
