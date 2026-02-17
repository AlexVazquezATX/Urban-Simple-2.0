'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const currentYear = new Date().getFullYear()

const overrideSchema = z.object({
  year: z.coerce.number().min(2020).max(2035),
  month: z.coerce.number().min(1).max(12),
  overrideStatus: z.string().optional(),
  overrideRate: z.literal('').or(z.coerce.number().min(0)),
  overrideFrequency: z.literal('').or(z.coerce.number().min(0).max(7)),
  overrideDaysOfWeek: z.array(z.number()),
  pauseStartDay: z.literal('').or(z.coerce.number().min(1).max(31)),
  pauseEndDay: z.literal('').or(z.coerce.number().min(1).max(31)),
  overrideNotes: z.string().optional(),
}).refine((data) => {
  // If one pause day is set, both must be set
  const hasStart = data.pauseStartDay !== '' && data.pauseStartDay !== undefined
  const hasEnd = data.pauseEndDay !== '' && data.pauseEndDay !== undefined
  if (hasStart !== hasEnd) return false
  // Start must be <= end
  if (hasStart && hasEnd && Number(data.pauseStartDay) > Number(data.pauseEndDay)) return false
  return true
}, {
  message: 'Both pause start and end days are required, and start must be before end',
  path: ['pauseStartDay'],
})

type OverrideFormValues = z.infer<typeof overrideSchema>

interface MonthlyOverrideFormProps {
  clientId: string
  facilityId: string
  facilityName?: string
  override?: any
  children: React.ReactNode
}

export function MonthlyOverrideForm({
  clientId,
  facilityId,
  facilityName,
  override,
  children,
}: MonthlyOverrideFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [existingOverride, setExistingOverride] = useState<any>(override || null)
  const router = useRouter()

  const form = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema) as any,
    defaultValues: {
      year: override?.year || currentYear,
      month: override?.month || new Date().getMonth() + 1,
      overrideStatus: override?.overrideStatus || '',
      overrideRate: override?.overrideRate && parseFloat(override.overrideRate) !== 0 ? parseFloat(override.overrideRate) : '',
      overrideFrequency: override?.overrideFrequency != null && override.overrideFrequency !== 0 ? override.overrideFrequency : '',
      overrideDaysOfWeek: override?.overrideDaysOfWeek || [],
      pauseStartDay: override?.pauseStartDay ?? '',
      pauseEndDay: override?.pauseEndDay ?? '',
      overrideNotes: override?.overrideNotes || '',
    },
  })

  const watchYear = form.watch('year')
  const watchMonth = form.watch('month')

  // Fetch existing override for the selected year/month when dialog opens
  const fetchExistingOverride = useCallback(async (yr: number, mo: number) => {
    try {
      const res = await fetch(
        `/api/clients/${clientId}/facilities/${facilityId}/overrides?year=${yr}`
      )
      if (!res.ok) return
      const overrides = await res.json()
      const match = overrides.find((o: any) => o.year === yr && o.month === mo)
      setExistingOverride(match || null)
      if (match) {
        // Populate form with existing override values
        // Treat 0 as blank for rate/frequency — these are almost certainly
        // artifacts of an earlier bug where blank inputs were coerced to 0.
        // Intentional $0 rate would use PAUSED status instead.
        const rate = match.overrideRate !== null ? parseFloat(match.overrideRate) : ''
        const freq = match.overrideFrequency !== null ? match.overrideFrequency : ''
        form.reset({
          year: match.year,
          month: match.month,
          overrideStatus: match.overrideStatus || '',
          overrideRate: rate === 0 ? '' : rate,
          overrideFrequency: freq === 0 ? '' : freq,
          overrideDaysOfWeek: match.overrideDaysOfWeek || [],
          pauseStartDay: match.pauseStartDay ?? '',
          pauseEndDay: match.pauseEndDay ?? '',
          overrideNotes: match.overrideNotes || '',
        })
      } else {
        // Clear all fields except year/month
        form.reset({
          year: yr,
          month: mo,
          overrideStatus: '',
          overrideRate: '',
          overrideFrequency: '',
          overrideDaysOfWeek: [],
          pauseStartDay: '',
          pauseEndDay: '',
          overrideNotes: '',
        })
      }
    } catch {
      // Silently fail — the user can still create a new override
    }
  }, [clientId, facilityId, form])

  // Fetch when dialog opens
  useEffect(() => {
    if (open && !override) {
      fetchExistingOverride(watchYear, watchMonth)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when year/month changes while dialog is open
  useEffect(() => {
    if (open && !override) {
      fetchExistingOverride(watchYear, watchMonth)
    }
  }, [watchYear, watchMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  const isEditing = !!override || !!existingOverride

  const onSubmit = async (data: OverrideFormValues) => {
    setLoading(true)
    try {
      const payload = {
        year: data.year,
        month: data.month,
        overrideStatus: data.overrideStatus || null,
        overrideRate: data.overrideRate !== '' && data.overrideRate !== undefined ? data.overrideRate : null,
        overrideFrequency: data.overrideFrequency !== '' && data.overrideFrequency !== undefined ? data.overrideFrequency : null,
        overrideDaysOfWeek: data.overrideDaysOfWeek,
        pauseStartDay: data.pauseStartDay !== '' && data.pauseStartDay !== undefined ? Number(data.pauseStartDay) : null,
        pauseEndDay: data.pauseEndDay !== '' && data.pauseEndDay !== undefined ? Number(data.pauseEndDay) : null,
        overrideNotes: data.overrideNotes || null,
      }

      const existingId = override?.id || existingOverride?.id
      const url = existingId
        ? `/api/clients/${clientId}/facilities/${facilityId}/overrides/${existingId}`
        : `/api/clients/${clientId}/facilities/${facilityId}/overrides`
      const method = existingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }

      toast.success(isEditing ? 'Override updated' : 'Override created')
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save override')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const existingId = override?.id || existingOverride?.id
    if (!existingId) return
    if (!confirm('Delete this override? The facility will revert to its default billing settings for this month.')) return

    setLoading(true)
    try {
      const res = await fetch(
        `/api/clients/${clientId}/facilities/${facilityId}/overrides/${existingId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete')
      }
      toast.success('Override deleted')
      setExistingOverride(null)
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete override')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md rounded-sm border-warm-200">
        <DialogHeader>
          <DialogTitle className="font-display font-medium text-warm-900">
            {isEditing ? 'Edit Monthly Override' : 'Add Monthly Override'}
            {isEditing && !override && (
              <span className="text-xs font-normal text-orange-600 ml-2">
                (existing override loaded)
              </span>
            )}
          </DialogTitle>
          {facilityName && (
            <DialogDescription className="text-warm-500">
              {facilityName}
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Year + Month */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700">Year</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="2020"
                        max="2035"
                        className="rounded-sm border-warm-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700">Month</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-sm border-warm-200">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-sm border-warm-200">
                        {MONTH_NAMES.map((name, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Override Status */}
            <FormField
              control={form.control}
              name="overrideStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Override Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-sm border-warm-200">
                        <SelectValue placeholder="No status override" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-sm border-warm-200">
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Override Rate */}
            <FormField
              control={form.control}
              name="overrideRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Override Rate ($)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Leave blank to use default rate"
                      className="rounded-sm border-warm-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Override Frequency */}
            <FormField
              control={form.control}
              name="overrideFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Override Frequency (per week)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type="number"
                      min="0"
                      max="7"
                      placeholder="Leave blank to use default"
                      className="rounded-sm border-warm-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Override Days of Week */}
            <FormField
              control={form.control}
              name="overrideDaysOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Override Days of Week</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    {DAY_OPTIONS.map((day) => {
                      const isChecked = field.value.includes(day.value)
                      return (
                        <label
                          key={day.value}
                          className={`flex items-center justify-center w-12 h-8 rounded-sm border text-xs font-medium cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-orange-100 border-orange-300 text-orange-700'
                              : 'bg-white border-warm-200 text-warm-500 hover:border-warm-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isChecked}
                            onChange={() => {
                              const next = isChecked
                                ? field.value.filter((d: number) => d !== day.value)
                                : [...field.value, day.value]
                              field.onChange(next)
                            }}
                          />
                          {day.label}
                        </label>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date-Range Pause */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-warm-700">Partial-Month Pause</p>
              <p className="text-xs text-warm-500">
                Pause service for specific days this month. The monthly rate will be pro-rated based on scheduled working days.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pauseStartDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-warm-700 text-xs">Pause From (day)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          type="number"
                          min="1"
                          max="31"
                          placeholder="e.g. 16"
                          className="rounded-sm border-warm-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pauseEndDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-warm-700 text-xs">Pause Through (day)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          type="number"
                          min="1"
                          max="31"
                          placeholder="e.g. 27"
                          className="rounded-sm border-warm-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="overrideNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Reason for this override..."
                      rows={2}
                      className="rounded-sm border-warm-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-2">
              {isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                  className="rounded-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete Override
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="rounded-sm border-warm-200 text-warm-700"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="lime" className="rounded-sm" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Update Override' : 'Create Override'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
