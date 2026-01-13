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
import { toast } from 'sonner'

const prospectSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  legalName: z.string().optional(),
  industry: z.string().optional(),
  businessType: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  estimatedSize: z.string().optional(),
  employeeCount: z.number().optional(),
  annualRevenue: z.string().optional(),
  status: z.string().min(1),
  priority: z.string().min(1),
  estimatedValue: z.string().optional(),
  source: z.string().min(1),
  sourceDetail: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  notes: z.string().optional(),
  branchId: z.string().optional(),
  assignedToId: z.string().optional(),
})

type ProspectFormValues = z.infer<typeof prospectSchema>

interface ProspectFormProps {
  prospect?: any
  children: React.ReactNode
}

export function ProspectForm({ prospect, children }: ProspectFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const address = (prospect?.address as any) || {}

  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectSchema),
    defaultValues: {
      companyName: prospect?.companyName || '',
      legalName: prospect?.legalName || '',
      industry: prospect?.industry || '',
      businessType: prospect?.businessType || '',
      address: {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zip: address.zip || '',
      },
      website: prospect?.website || '',
      phone: prospect?.phone || '',
      estimatedSize: prospect?.estimatedSize || '',
      employeeCount: prospect?.employeeCount || undefined,
      annualRevenue: prospect?.annualRevenue?.toString() || '',
      status: prospect?.status || 'new',
      priority: prospect?.priority || 'medium',
      estimatedValue: prospect?.estimatedValue?.toString() || '',
      source: prospect?.source || 'manual',
      sourceDetail: prospect?.sourceDetail || '',
      tags: prospect?.tags?.join(', ') || '',
      notes: prospect?.notes || '',
      branchId: prospect?.branchId || '',
      assignedToId: prospect?.assignedToId || '',
    },
  })

  const onSubmit = async (data: ProspectFormValues) => {
    setLoading(true)
    try {
      const payload: any = {
        companyName: data.companyName,
        legalName: data.legalName || null,
        industry: data.industry || null,
        businessType: data.businessType || null,
        address: data.address && Object.values(data.address).some(v => v) ? data.address : null,
        website: data.website || null,
        phone: data.phone || null,
        estimatedSize: data.estimatedSize || null,
        employeeCount: data.employeeCount || null,
        annualRevenue: data.annualRevenue ? parseFloat(data.annualRevenue) : null,
        status: data.status,
        priority: data.priority,
        estimatedValue: data.estimatedValue ? parseFloat(data.estimatedValue) : null,
        source: data.source,
        sourceDetail: data.sourceDetail || null,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        notes: data.notes || null,
        branchId: data.branchId || null,
        assignedToId: data.assignedToId || null,
      }

      let url: string
      let method: string

      if (prospect) {
        url = `/api/growth/prospects/${prospect.id}`
        method = 'PATCH'
      } else {
        url = '/api/growth/prospects'
        method = 'POST'
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save prospect')
      }

      toast.success(`Prospect ${prospect ? 'updated' : 'created'}`)
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
            {prospect ? 'Edit Prospect' : 'Add New Prospect'}
          </DialogTitle>
          <DialogDescription>
            {prospect
              ? 'Update prospect information'
              : 'Add a new prospect to your pipeline'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={loading} placeholder="e.g., Restaurant" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="researching">Researching</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="engaged">Engaged</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                        <SelectItem value="nurturing">Nurturing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={loading} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : prospect ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

