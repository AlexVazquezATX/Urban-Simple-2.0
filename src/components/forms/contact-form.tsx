'use client'

import { useState } from 'react'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  role: z.enum(['primary', 'billing', 'operations', 'other']),
  isPortalUser: z.boolean().default(false),
  // Ops alert routing. Empty locationIds = every location of the client.
  locationIds: z.array(z.string()).default([]),
  alertEmail: z.boolean().default(false),
  alertSms: z.boolean().default(false),
  smsConsent: z.boolean().default(false),
})

type ContactFormValues = z.infer<typeof contactSchema>

interface ContactFormProps {
  clientId: string
  contact?: any
  /** The client's locations, for per-location alert routing. */
  locations?: Array<{ id: string; name: string }>
  children: React.ReactNode
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const lastTen = (v: unknown) => String(v || '').replace(/\D/g, '').slice(-10)

export function ContactForm({ clientId, contact, locations = [], children }: ContactFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locationScope, setLocationScope] = useState<'all' | 'some'>(
    contact?.locationIds?.length ? 'some' : 'all'
  )
  const router = useRouter()
  const smsOptedOutAt: string | Date | null = contact?.smsOptedOutAt ?? null
  const smsAlreadyOn = !!contact?.alertSms

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema) as any,
    defaultValues: {
      firstName: contact?.firstName || '',
      lastName: contact?.lastName || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      role: contact?.role || 'primary',
      isPortalUser: contact?.isPortalUser || false,
      locationIds: contact?.locationIds || [],
      alertEmail: contact?.alertEmail || false,
      alertSms: contact?.alertSms || false,
      smsConsent: false,
    },
  })

  const alertSms = form.watch('alertSms')
  const selectedLocationIds = form.watch('locationIds')
  const phoneValue = form.watch('phone')
  // Consent is per number: turning texts on, or changing the number, asks again.
  const needsConsent =
    !smsOptedOutAt && alertSms && (!smsAlreadyOn || lastTen(phoneValue) !== lastTen(contact?.phone))

  const onSubmit = async (data: ContactFormValues) => {
    if (data.alertSms && !smsOptedOutAt && !data.phone?.trim()) {
      form.setError('phone', { message: 'Add a mobile number for text alerts' })
      return
    }
    if (needsConsent && !data.smsConsent) {
      form.setError('smsConsent', { message: 'Confirm consent before turning on text alerts' })
      return
    }
    if (locationScope === 'some' && data.locationIds.length === 0) {
      form.setError('locationIds', { message: 'Pick at least one location, or choose all locations' })
      return
    }
    setLoading(true)
    try {
      const url = contact
        ? `/api/clients/${clientId}/contacts/${contact.id}`
        : `/api/clients/${clientId}/contacts`
      const method = contact ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          locationIds: locationScope === 'all' ? [] : data.locationIds,
          // Texts stay off for anyone who replied STOP.
          alertSms: smsOptedOutAt ? false : data.alertSms,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save contact')
      }

      toast.success(contact ? 'Contact updated' : 'Contact created')
      if (!contact) {
        form.reset()
        setLocationScope('all')
      }
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
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? 'Edit Contact' : 'Add New Contact'}
          </DialogTitle>
          <DialogDescription>
            {contact
              ? 'Update contact information'
              : 'Add a new contact for this client'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(512) 555-0123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPortalUser"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 sm:pt-8">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Portal Access</FormLabel>
                      <FormDescription>
                        Grant access to client portal
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Service alerts: unfinished work, issue updates, replies */}
            <div className="space-y-4 rounded-[12px] border border-border bg-secondary/40 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Service alerts</p>
                <p className="text-xs text-muted-foreground">
                  Unfinished work, issue updates and replies for the locations below.
                </p>
              </div>

              <FormField
                control={form.control}
                name="alertEmail"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel>Email alerts</FormLabel>
                      <FormDescription>Sent to the email above.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alertSms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel>Text alerts</FormLabel>
                      <FormDescription>
                        {smsOptedOutAt
                          ? `Replied STOP on ${formatDate(smsOptedOutAt)}. Texts can't be turned back on from here; they need to text START.`
                          : 'Sent to the phone above.'}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={smsOptedOutAt ? false : field.value}
                        onCheckedChange={field.onChange}
                        disabled={!!smsOptedOutAt}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {needsConsent && (
                <FormField
                  control={form.control}
                  name="smsConsent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-[10px] border border-border bg-card p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(v === true)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-snug">
                        <FormLabel>Client gave consent to receive service alert texts at this number</FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              )}
              {smsAlreadyOn && contact?.smsConsentAt && !needsConsent && !smsOptedOutAt && (
                <p className="text-xs text-muted-foreground">
                  Text consent recorded {formatDate(contact.smsConsentAt)}.
                </p>
              )}

              {locations.length > 0 && (
                <FormField
                  control={form.control}
                  name="locationIds"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Alert locations</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={locationScope === 'all' ? 'secondary' : 'ghost'}
                          onClick={() => setLocationScope('all')}
                        >
                          All locations
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={locationScope === 'some' ? 'secondary' : 'ghost'}
                          onClick={() => setLocationScope('some')}
                        >
                          Only some
                        </Button>
                      </div>
                      {locationScope === 'some' && (
                        <div className="max-h-48 space-y-1 overflow-y-auto rounded-[10px] border border-border bg-card p-2">
                          {locations.map((l) => (
                            <Label
                              key={l.id}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal hover:bg-secondary/60"
                            >
                              <Checkbox
                                checked={field.value.includes(l.id)}
                                onCheckedChange={(v) =>
                                  field.onChange(
                                    v === true
                                      ? [...field.value, l.id]
                                      : field.value.filter((x) => x !== l.id)
                                  )
                                }
                              />
                              {l.name}
                            </Label>
                          ))}
                        </div>
                      )}
                      <FormDescription>
                        {locationScope === 'all'
                          ? 'Alerts for every location of this client, including new ones.'
                          : `${selectedLocationIds.length} selected.`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

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
                  : contact
                    ? 'Update Contact'
                    : 'Create Contact'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}


