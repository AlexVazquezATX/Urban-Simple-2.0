'use client'

import { useState } from 'react'
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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const facilitySchema = z.object({
  locationId: z.string().min(1, 'Please select a location'),
  category: z.string().optional(),
  defaultMonthlyRate: z.coerce.number().min(0, 'Rate must be positive'),
  rateType: z.enum(['FLAT_MONTHLY', 'DERIVED']),
  taxBehavior: z.enum(['INHERIT_CLIENT', 'TAX_INCLUDED', 'PRE_TAX']),
  status: z.enum(['ACTIVE', 'PAUSED', 'SEASONAL_PAUSED', 'PENDING_APPROVAL', 'CLOSED']),
  goLiveDate: z.string().optional(),
  normalDaysOfWeek: z.array(z.number()),
  normalFrequencyPerWeek: z.coerce.number().min(0).max(7),
  scopeOfWorkNotes: z.string().optional(),
})

type FacilityFormValues = z.infer<typeof facilitySchema>

interface FacilityProfileFormProps {
  clientId: string
  availableLocations: any[]
  facility?: any
  children: React.ReactNode
}

export function FacilityProfileForm({
  clientId,
  availableLocations,
  facility,
  children,
}: FacilityProfileFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isEditing = !!facility

  // When editing, include the current facility's location in available options
  const locationOptions = isEditing
    ? [
        { id: facility.locationId, name: facility.location?.name || 'Current Location' },
        ...availableLocations.filter((l: any) => l.id !== facility.locationId),
      ]
    : availableLocations

  const form = useForm<FacilityFormValues>({
    resolver: zodResolver(facilitySchema) as any,
    defaultValues: {
      locationId: facility?.locationId || '',
      category: facility?.category || '',
      defaultMonthlyRate: facility ? parseFloat(facility.defaultMonthlyRate) : 0,
      rateType: facility?.rateType || 'FLAT_MONTHLY',
      taxBehavior: facility?.taxBehavior || 'INHERIT_CLIENT',
      status: facility?.status || 'PENDING_APPROVAL',
      goLiveDate: facility?.goLiveDate
        ? new Date(facility.goLiveDate).toISOString().split('T')[0]
        : '',
      normalDaysOfWeek: facility?.normalDaysOfWeek || [],
      normalFrequencyPerWeek: facility?.normalFrequencyPerWeek || 0,
      scopeOfWorkNotes: facility?.scopeOfWorkNotes || '',
    },
  })

  const onSubmit = async (data: FacilityFormValues) => {
    setLoading(true)
    try {
      const url = isEditing
        ? `/api/clients/${clientId}/facilities/${facility.id}`
        : `/api/clients/${clientId}/facilities`
      const method = isEditing ? 'PATCH' : 'POST'

      const payload = {
        ...data,
        goLiveDate: data.goLiveDate || null,
        category: data.category || null,
        scopeOfWorkNotes: data.scopeOfWorkNotes || null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }

      toast.success(isEditing ? 'Facility updated' : 'Facility created')
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save facility')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-sm border-warm-200">
        <DialogHeader>
          <DialogTitle className="font-display font-medium text-warm-900">
            {isEditing ? 'Edit Facility' : 'Add Facility'}
          </DialogTitle>
          <DialogDescription className="text-warm-500">
            {isEditing
              ? 'Update facility profile settings'
              : 'Create a billing & scheduling profile for a location'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Location */}
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Location</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-sm border-warm-200">
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-sm border-warm-200">
                      {locationOptions.map((loc: any) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Category</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. restaurant, bar, pool"
                      className="rounded-sm border-warm-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rate + Rate Type row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultMonthlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700">Monthly Rate ($)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        className="rounded-sm border-warm-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700">Rate Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-sm border-warm-200">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-sm border-warm-200">
                        <SelectItem value="FLAT_MONTHLY">Flat Monthly</SelectItem>
                        <SelectItem value="DERIVED">Derived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tax Behavior + Status row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taxBehavior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700">Tax Behavior</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-sm border-warm-200">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-sm border-warm-200">
                        <SelectItem value="INHERIT_CLIENT">Inherit from Client</SelectItem>
                        <SelectItem value="TAX_INCLUDED">Tax Included</SelectItem>
                        <SelectItem value="PRE_TAX">Pre-tax</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-sm border-warm-200">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-sm border-warm-200">
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PAUSED">Paused</SelectItem>
                        <SelectItem value="SEASONAL_PAUSED">Seasonal Paused</SelectItem>
                        <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Go-live Date */}
            <FormField
              control={form.control}
              name="goLiveDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Go-live Date</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      className="rounded-sm border-warm-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequency */}
            <FormField
              control={form.control}
              name="normalFrequencyPerWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Frequency per Week</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      max="7"
                      className="rounded-sm border-warm-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Days of Week */}
            <FormField
              control={form.control}
              name="normalDaysOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Days of Week</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    {DAY_OPTIONS.map((day) => {
                      const isChecked = field.value.includes(day.value)
                      return (
                        <label
                          key={day.value}
                          className={`flex items-center justify-center w-12 h-8 rounded-sm border text-xs font-medium cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-lime-100 border-lime-300 text-lime-700'
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

            {/* Scope of Work */}
            <FormField
              control={form.control}
              name="scopeOfWorkNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Scope of Work Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the scope of work for this facility..."
                      rows={3}
                      className="rounded-sm border-warm-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
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
                {isEditing ? 'Update Facility' : 'Create Facility'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
