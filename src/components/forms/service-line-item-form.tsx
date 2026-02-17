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
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const currentYear = new Date().getFullYear()

const serviceItemSchema = z.object({
  year: z.coerce.number().min(2020).max(2035),
  month: z.coerce.number().min(1).max(12),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be > 0'),
  unitRate: z.coerce.number().min(0, 'Rate must be >= 0'),
  facilityProfileId: z.string().optional(),
  taxBehavior: z.string().optional(),
  performedDate: z.string().optional(),
  notes: z.string().optional(),
})

type ServiceItemFormValues = z.infer<typeof serviceItemSchema>

interface ServiceLineItemFormProps {
  clientId: string
  facilities?: Array<{ id: string; location: { name: string } }>
  item?: any // existing item for editing
  defaultYear?: number
  defaultMonth?: number
  onSuccess?: () => void
  children: React.ReactNode
}

export function ServiceLineItemForm({
  clientId,
  facilities,
  item,
  defaultYear,
  defaultMonth,
  onSuccess,
  children,
}: ServiceLineItemFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isEditing = !!item

  const form = useForm<ServiceItemFormValues>({
    resolver: zodResolver(serviceItemSchema) as any,
    defaultValues: {
      year: item?.year || defaultYear || currentYear,
      month: item?.month || defaultMonth || new Date().getMonth() + 1,
      description: item?.description || '',
      quantity: item?.quantity ?? 1,
      unitRate: item?.unitRate ?? '',
      facilityProfileId: item?.facilityProfileId || '',
      taxBehavior: item?.taxBehavior || 'INHERIT_CLIENT',
      performedDate: item?.performedDate || '',
      notes: item?.notes || '',
    },
  })

  const onSubmit = async (data: ServiceItemFormValues) => {
    setLoading(true)
    try {
      const payload = {
        year: data.year,
        month: data.month,
        description: data.description,
        quantity: data.quantity,
        unitRate: data.unitRate,
        facilityProfileId: data.facilityProfileId || null,
        taxBehavior: data.taxBehavior || 'INHERIT_CLIENT',
        performedDate: data.performedDate || null,
        notes: data.notes || null,
      }

      const url = isEditing
        ? `/api/clients/${clientId}/service-items/${item.id}`
        : `/api/clients/${clientId}/service-items`
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }

      toast.success(isEditing ? 'Service item updated' : 'Service item added')
      setOpen(false)
      onSuccess?.()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save service item')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!item?.id) return
    if (!confirm('Delete this service line item?')) return

    setLoading(true)
    try {
      const res = await fetch(
        `/api/clients/${clientId}/service-items/${item.id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete')
      }
      toast.success('Service item deleted')
      setOpen(false)
      onSuccess?.()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete')
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
            {isEditing ? 'Edit Service Item' : 'Add Service Item'}
          </DialogTitle>
          <DialogDescription className="text-warm-500">
            One-time or ad-hoc charge for this billing period
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Year / Month */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700 text-xs">Month</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-sm border-warm-200">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-sm">
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
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700 text-xs">Year</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-sm border-warm-200">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-sm">
                        {Array.from({ length: 5 }, (_, i) => currentYear - 1 + i).map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700 text-xs">Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. High dusting — all chandeliers"
                      className="rounded-sm border-warm-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity / Unit Rate */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700 text-xs">Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="rounded-sm border-warm-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700 text-xs">Unit Rate ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="rounded-sm border-warm-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Facility (optional) */}
            {facilities && facilities.length > 0 && (
              <FormField
                control={form.control}
                name="facilityProfileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700 text-xs">
                      Facility <span className="text-warm-400">(optional)</span>
                    </FormLabel>
                    <Select
                      value={field.value || '_none'}
                      onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-sm border-warm-200">
                          <SelectValue placeholder="Client-level (no facility)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-sm">
                        <SelectItem value="_none">Client-level (no facility)</SelectItem>
                        {facilities.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tax Behavior */}
            <FormField
              control={form.control}
              name="taxBehavior"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700 text-xs">Tax Behavior</FormLabel>
                  <Select
                    value={field.value || 'INHERIT_CLIENT'}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-sm border-warm-200">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-sm">
                      <SelectItem value="INHERIT_CLIENT">Inherit Client Rate</SelectItem>
                      <SelectItem value="TAX_INCLUDED">Tax Included</SelectItem>
                      <SelectItem value="PRE_TAX">Pre-tax (add tax)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Performed Date */}
            <FormField
              control={form.control}
              name="performedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700 text-xs">
                    Date Performed <span className="text-warm-400">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="rounded-sm border-warm-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700 text-xs">
                    Notes <span className="text-warm-400">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Additional details..."
                      className="rounded-sm border-warm-200"
                      {...field}
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
                  Delete
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
                  {isEditing ? 'Update' : 'Add Service Item'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
