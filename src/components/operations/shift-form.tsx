'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  FormDescription,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/api'

const shiftSchema = z
  .object({
    locationIds: z.array(z.string()).min(1, 'At least one location is required'),
    associateId: z.string().optional(),
    managerId: z.string().optional(),
    date: z.string().min(1, 'Date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    isRecurring: z.boolean().default(false),
    recurringPattern: z
      .object({
        type: z.literal('weekly'),
        daysOfWeek: z.array(z.number()),
        startTime: z.string(),
        endTime: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
      })
      .optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.associateId || data.managerId, {
    message: 'Either associate or manager must be selected',
    path: ['associateId'],
  })

type ShiftFormValues = z.infer<typeof shiftSchema>

interface ShiftFormProps {
  shift?: any
  defaultDate?: string
  children: React.ReactNode
}

export function ShiftForm({ shift, defaultDate, children }: ShiftFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<any[]>([])
  const [associates, setAssociates] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    if (open) {
      // Fetch locations
      fetch(getApiUrl('/api/locations'))
        .then((res) => res.json())
        .then((data) => setLocations(data))
        .catch(() => toast.error('Failed to load locations'))

      // Fetch associates
      fetch(getApiUrl('/api/users'))
        .then((res) => res.json())
        .then((data) => {
          const associateUsers = data.filter(
            (u: any) => u.role === 'ASSOCIATE' && u.isActive
          )
          setAssociates(associateUsers)

          const managerUsers = data.filter(
            (u: any) => (u.role === 'MANAGER' || u.role === 'ADMIN') && u.isActive
          )
          setManagers(managerUsers)
        })
        .catch(() => toast.error('Failed to load users'))
    }
  }, [open])

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema) as any,
    defaultValues: {
      locationIds:
        // After migration, shiftLocations will be available
        shift?.shiftLocations && Array.isArray(shift.shiftLocations) && shift.shiftLocations.length > 0
          ? shift.shiftLocations.map((sl: any) => sl.locationId)
          : shift?.locationId
            ? [shift.locationId]
            : [],
      associateId: shift?.associateId || '',
      managerId: shift?.managerId || '',
      date: shift?.date
        ? new Date(shift.date).toISOString().split('T')[0]
        : defaultDate || new Date().toISOString().split('T')[0],
      startTime: shift?.startTime || '21:00',
      endTime: shift?.endTime || '02:00',
      isRecurring: shift?.isRecurring || false,
      recurringPattern: shift?.recurringPattern
        ? {
            type: 'weekly',
            daysOfWeek: shift.recurringPattern.daysOfWeek || [],
            startTime: shift.recurringPattern.startTime || shift.startTime || '21:00',
            endTime: shift.recurringPattern.endTime || shift.endTime || '02:00',
            startDate: shift.recurringPattern.startDate
              ? new Date(shift.recurringPattern.startDate).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            endDate: shift.recurringPattern.endDate
              ? new Date(shift.recurringPattern.endDate).toISOString().split('T')[0]
              : undefined,
          }
        : undefined,
      notes: shift?.notes || '',
    },
  })

  const isRecurring = form.watch('isRecurring')
  const locationIds = form.watch('locationIds') || []
  const managerId = form.watch('managerId')
  const associateId = form.watch('associateId')

  // Get associates assigned to selected locations
  const availableAssociates = associates

  const onSubmit = async (data: ShiftFormValues) => {
    setLoading(true)
    try {
      const url = shift ? `/api/shifts/${shift.id}` : '/api/shifts'
      const method = shift ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          locationIds: data.locationIds,
          associateId: data.associateId || null,
          managerId: data.managerId || null,
          recurringPattern: data.isRecurring ? data.recurringPattern : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save shift')
      }

      toast.success(shift ? 'Shift updated' : 'Shift created')
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {shift ? 'Edit Shift' : managerId ? 'Schedule Manager' : 'Create Shift'}
          </DialogTitle>
          <DialogDescription>
            {shift
              ? 'Update shift details'
              : managerId
                ? 'Schedule a manager to visit multiple locations'
                : 'Schedule a new shift for an associate'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="locationIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {managerId ? 'Locations to Visit *' : 'Location *'}
                  </FormLabel>
                  <FormDescription>
                    {managerId
                      ? 'Select all locations this manager will visit (typically 5-10)'
                      : 'Select the location for this shift'}
                  </FormDescription>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                    {locations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Loading locations...</p>
                    ) : (
                      locations.map((location) => (
                        <div key={location.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`location-${location.id}`}
                            checked={field.value?.includes(location.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value || []
                              if (checked) {
                                field.onChange([...current, location.id])
                              } else {
                                field.onChange(current.filter((id) => id !== location.id))
                              }
                            }}
                          />
                          <Label
                            htmlFor={`location-${location.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {location.client?.name} - {location.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                  <FormMessage />
                  {field.value && field.value.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {field.value.length} location{field.value.length === 1 ? '' : 's'}{' '}
                      selected
                    </p>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === '__none__' ? '' : value)
                        // Clear associate if manager is selected
                        if (value !== '__none__') {
                          form.setValue('associateId', '')
                        }
                      }}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.firstName} {manager.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select manager for multi-location review route
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="associateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associate</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === '__none__' ? '' : value)
                        // Clear manager if associate is selected
                        if (value !== '__none__') {
                          form.setValue('managerId', '')
                        }
                      }}
                      value={field.value || '__none__'}
                      disabled={!!managerId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select associate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {availableAssociates.map((associate) => (
                          <SelectItem key={associate.id} value={associate.id}>
                            {associate.firstName} {associate.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select associate for single-location shift
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Recurring Shift</FormLabel>
                    <FormDescription>
                      Create this shift on multiple days
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {isRecurring && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <FormLabel>Recurring Pattern</FormLabel>
                <FormField
                  control={form.control}
                  name="recurringPattern.daysOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days of Week *</FormLabel>
                      <div className="grid grid-cols-4 gap-2">
                        {daysOfWeek.map((day) => (
                          <div key={day.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${day.value}`}
                              checked={field.value?.includes(day.value)}
                              onCheckedChange={(checked) => {
                                const current = field.value || []
                                if (checked) {
                                  field.onChange([...current, day.value])
                                } else {
                                  field.onChange(
                                    current.filter((d) => d !== day.value)
                                  )
                                }
                              }}
                            />
                            <Label
                              htmlFor={`day-${day.value}`}
                              className="text-sm cursor-pointer"
                            >
                              {day.label.slice(0, 3)}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recurringPattern.startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pattern Start Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurringPattern.endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pattern End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recurringPattern.startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurring Start Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurringPattern.endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurring End Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this shift..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : shift ? 'Update Shift' : 'Create Shift'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

