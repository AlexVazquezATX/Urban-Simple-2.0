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
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getApiUrl } from '@/lib/api'

const assignmentSchema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  userId: z.string().min(1, 'Associate is required'),
  monthlyPay: z.string().min(1, 'Monthly pay is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Must be a valid positive number'
  ),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

type AssignmentFormValues = z.infer<typeof assignmentSchema>

interface AssignmentFormProps {
  assignment?: any
  children: React.ReactNode
}

export function AssignmentForm({ assignment, children }: AssignmentFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<any[]>([])
  const [associates, setAssociates] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    if (open) {
      // Fetch locations
      fetch(getApiUrl('/api/locations'))
        .then((res) => res.json())
        .then((data) => setLocations(data))
        .catch(() => toast.error('Failed to load locations'))

      // Fetch associates (users with ASSOCIATE role)
      fetch(getApiUrl('/api/users'))
        .then((res) => res.json())
        .then((data) => {
          const associateUsers = data.filter(
            (u: any) => u.role === 'ASSOCIATE' && u.isActive
          )
          setAssociates(associateUsers)
        })
        .catch(() => toast.error('Failed to load associates'))
    }
  }, [open])

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema) as any,
    defaultValues: {
      locationId: assignment?.locationId || '',
      userId: assignment?.userId || '',
      monthlyPay: assignment?.monthlyPay?.toString() || '',
      startDate: assignment?.startDate
        ? new Date(assignment.startDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      endDate: assignment?.endDate
        ? new Date(assignment.endDate).toISOString().split('T')[0]
        : '',
      isActive: assignment?.isActive ?? true,
    },
  })

  const onSubmit = async (data: AssignmentFormValues) => {
    setLoading(true)
    try {
      const url = assignment
        ? `/api/location-assignments/${assignment.id}`
        : '/api/location-assignments'
      const method = assignment ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          monthlyPay: parseFloat(data.monthlyPay),
          endDate: data.endDate || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save assignment')
      }

      toast.success(assignment ? 'Assignment updated' : 'Assignment created')
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {assignment ? 'Edit Assignment' : 'Create Location Assignment'}
          </DialogTitle>
          <DialogDescription>
            {assignment
              ? 'Update assignment details'
              : 'Assign an associate to a location with a monthly pay rate'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.client?.name} - {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Associate *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select associate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {associates.map((associate) => (
                        <SelectItem key={associate.id} value={associate.id}>
                          {associate.firstName} {associate.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyPay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Pay ($) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                {loading ? 'Saving...' : assignment ? 'Update Assignment' : 'Create Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}


