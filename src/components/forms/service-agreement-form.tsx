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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const agreementSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  locationId: z.string().min(1, 'Location is required'),
  description: z.string().min(1, 'Description is required'),
  monthlyAmount: z.string().min(1, 'Monthly amount is required'),
  monthlyLaborCost: z.string().optional(),
  monthlyMaterialCost: z.string().optional(),
  monthlyOtherCost: z.string().optional(),
  billingDay: z.string().min(1, 'Billing day is required'),
  paymentTerms: z.enum(['NET_15', 'NET_30', 'DUE_ON_RECEIPT']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
})

type AgreementFormValues = z.infer<typeof agreementSchema>

interface ServiceAgreementFormProps {
  agreement?: any
  children: React.ReactNode
}

export function ServiceAgreementForm({
  agreement,
  children,
}: ServiceAgreementFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const router = useRouter()

  const form = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementSchema) as any,
    defaultValues: {
      clientId: agreement?.clientId || '',
      locationId: agreement?.locationId || '',
      description: agreement?.description || '',
      monthlyAmount: agreement?.monthlyAmount?.toString() || '',
      monthlyLaborCost: agreement?.monthlyLaborCost?.toString() || '',
      monthlyMaterialCost: agreement?.monthlyMaterialCost?.toString() || '',
      monthlyOtherCost: agreement?.monthlyOtherCost?.toString() || '',
      billingDay: agreement?.billingDay?.toString() || '1',
      paymentTerms: agreement?.paymentTerms || 'NET_30',
      startDate: agreement?.startDate
        ? new Date(agreement.startDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      endDate: agreement?.endDate
        ? new Date(agreement.endDate).toISOString().split('T')[0]
        : '',
    },
  })

  const selectedClientId = form.watch('clientId')

  // Live profit/margin readout from the form values.
  const watchedRevenue = form.watch('monthlyAmount')
  const watchedLabor = form.watch('monthlyLaborCost')
  const watchedMaterial = form.watch('monthlyMaterialCost')
  const watchedOther = form.watch('monthlyOtherCost')
  const liveRevenue = parseFloat(watchedRevenue || '0') || 0
  const liveCosts =
    (parseFloat(watchedLabor || '0') || 0) +
    (parseFloat(watchedMaterial || '0') || 0) +
    (parseFloat(watchedOther || '0') || 0)
  const liveProfit = liveRevenue - liveCosts
  const liveMargin = liveRevenue > 0 ? (liveProfit / liveRevenue) * 100 : null
  const marginColorClass = liveMargin === null
    ? 'text-warm-500'
    : liveMargin < 0
      ? 'text-red-600'
      : liveMargin < 20
        ? 'text-amber-600'
        : 'text-lime-700'

  // Load clients on mount
  useEffect(() => {
    async function loadClients() {
      try {
        const response = await fetch('/api/clients')
        if (response.ok) {
          const data = await response.json()
          setClients(data)
        }
      } catch (error) {
        console.error('Failed to load clients:', error)
      }
    }
    loadClients()
  }, [])

  // Load locations when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setLocations([])
      form.setValue('locationId', '')
      return
    }

    async function loadLocations() {
      try {
        const response = await fetch(`/api/clients/${selectedClientId}`)
        if (response.ok) {
          const data = await response.json()
          setLocations(data.locations || [])
        }
      } catch (error) {
        console.error('Failed to load locations:', error)
      }
    }

    loadLocations()
  }, [selectedClientId, form])

  const onSubmit = async (data: AgreementFormValues) => {
    setLoading(true)
    try {
      const url = agreement
        ? `/api/service-agreements/${agreement.id}`
        : '/api/service-agreements'
      const method = agreement ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          monthlyAmount: parseFloat(data.monthlyAmount),
          monthlyLaborCost: data.monthlyLaborCost && data.monthlyLaborCost !== '' ? parseFloat(data.monthlyLaborCost) : null,
          monthlyMaterialCost: data.monthlyMaterialCost && data.monthlyMaterialCost !== '' ? parseFloat(data.monthlyMaterialCost) : null,
          monthlyOtherCost: data.monthlyOtherCost && data.monthlyOtherCost !== '' ? parseFloat(data.monthlyOtherCost) : null,
          billingDay: parseInt(data.billingDay),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save service agreement')
      }

      toast.success(
        agreement ? 'Service agreement updated' : 'Service agreement created'
      )
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {agreement ? 'Edit Service Agreement' : 'New Service Agreement'}
          </DialogTitle>
          <DialogDescription>
            {agreement
              ? 'Update service agreement details'
              : 'Create a new recurring service agreement'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!agreement}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
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
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!selectedClientId || !!agreement}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {!selectedClientId && (
                      <FormDescription>
                        Select a client first
                      </FormDescription>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nightly cleaning service"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Revenue *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>What we bill the client per month.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Day *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(
                          (day) => (
                            <SelectItem key={day} value={day.toString()}>
                              Day {day}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Day of month to generate invoice (1-28)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-warm-600 dark:text-cream-400">
                  Operational P&L
                </p>
                <p className="text-[10px] text-warm-500 dark:text-cream-400">All optional. Profit and margin calculate live.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="monthlyLaborCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Labor</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monthlyMaterialCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Materials</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monthlyOtherCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-sm bg-warm-50/60 dark:bg-charcoal-900/40 p-2 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Total Cost</p>
                  <p className="font-mono font-medium">${liveCosts.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Profit</p>
                  <p className={`font-mono font-medium ${marginColorClass}`}>
                    ${liveProfit.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Margin</p>
                  <p className={`font-mono font-medium ${marginColorClass}`}>
                    {liveMargin === null ? '—' : `${liveMargin.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NET_15">Net 15</SelectItem>
                        <SelectItem value="NET_30">Net 30</SelectItem>
                        <SelectItem value="DUE_ON_RECEIPT">
                          Due on Receipt
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                  <FormDescription>
                    Leave blank for ongoing agreement
                  </FormDescription>
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
                {loading
                  ? 'Saving...'
                  : agreement
                    ? 'Update Agreement'
                    : 'Create Agreement'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}




