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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
]

const seasonalRuleSchema = z.object({
  mode: z.enum(['active', 'paused']),
  selectedMonths: z.array(z.number()).min(1, 'Select at least one month'),
  effectiveYearStart: z.coerce.number().optional(),
  effectiveYearEnd: z.coerce.number().optional(),
  notes: z.string().optional(),
})

type SeasonalRuleFormValues = z.infer<typeof seasonalRuleSchema>

interface SeasonalRuleFormProps {
  clientId: string
  facilityId: string
  facilityName?: string
  rule?: any
  children: React.ReactNode
}

export function SeasonalRuleForm({
  clientId,
  facilityId,
  facilityName,
  rule,
  children,
}: SeasonalRuleFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isEditing = !!rule

  const defaultMode = rule?.pausedMonths?.length > 0 ? 'paused' : 'active'
  const defaultMonths = rule
    ? (defaultMode === 'paused' ? rule.pausedMonths : rule.activeMonths)
    : []

  const form = useForm<SeasonalRuleFormValues>({
    resolver: zodResolver(seasonalRuleSchema) as any,
    defaultValues: {
      mode: defaultMode as 'active' | 'paused',
      selectedMonths: defaultMonths,
      effectiveYearStart: rule?.effectiveYearStart || undefined,
      effectiveYearEnd: rule?.effectiveYearEnd || undefined,
      notes: rule?.notes || '',
    },
  })

  const mode = form.watch('mode')

  const onSubmit = async (data: SeasonalRuleFormValues) => {
    setLoading(true)
    try {
      const payload = {
        activeMonths: data.mode === 'active' ? data.selectedMonths : [],
        pausedMonths: data.mode === 'paused' ? data.selectedMonths : [],
        effectiveYearStart: data.effectiveYearStart || null,
        effectiveYearEnd: data.effectiveYearEnd || null,
        notes: data.notes || null,
      }

      const url = isEditing
        ? `/api/clients/${clientId}/facilities/${facilityId}/seasonal-rules/${rule.id}`
        : `/api/clients/${clientId}/facilities/${facilityId}/seasonal-rules`
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

      // Also enable seasonal rules on the facility if creating
      if (!isEditing) {
        await fetch(`/api/clients/${clientId}/facilities/${facilityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seasonalRulesEnabled: true }),
        })
      }

      toast.success(isEditing ? 'Seasonal rule updated' : 'Seasonal rule created')
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save seasonal rule')
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
            {isEditing ? 'Edit Seasonal Rule' : 'Add Seasonal Rule'}
          </DialogTitle>
          {facilityName && (
            <DialogDescription className="text-warm-500">
              {facilityName}
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Mode toggle */}
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Define by</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === 'active' ? 'lime' : 'outline'}
                      size="sm"
                      className="rounded-sm flex-1"
                      onClick={() => field.onChange('active')}
                    >
                      Active Months
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'paused' ? 'lime' : 'outline'}
                      size="sm"
                      className="rounded-sm flex-1"
                      onClick={() => field.onChange('paused')}
                    >
                      Paused Months
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Month selector */}
            <FormField
              control={form.control}
              name="selectedMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">
                    {mode === 'active' ? 'Active months' : 'Paused months'}
                  </FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {MONTHS.map((month) => {
                      const isSelected = field.value.includes(month.value)
                      return (
                        <label
                          key={month.value}
                          className={`flex items-center justify-center h-8 rounded-sm border text-xs font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? mode === 'active'
                                ? 'bg-lime-100 border-lime-300 text-lime-700'
                                : 'bg-yellow-100 border-yellow-300 text-yellow-700'
                              : 'bg-white border-warm-200 text-warm-500 hover:border-warm-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => {
                              const next = isSelected
                                ? field.value.filter((m: number) => m !== month.value)
                                : [...field.value, month.value]
                              field.onChange(next)
                            }}
                          />
                          {month.label}
                        </label>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Year range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="effectiveYearStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700">From Year</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        type="number"
                        placeholder="Any"
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
                name="effectiveYearEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-warm-700">To Year</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        type="number"
                        placeholder="Any"
                        min="2020"
                        max="2035"
                        className="rounded-sm border-warm-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-warm-700">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Optional notes about this seasonal rule..."
                      rows={2}
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
                {isEditing ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
