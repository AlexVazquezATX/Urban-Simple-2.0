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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ImageUpload } from '@/components/ui/image-upload'
import { toast } from 'sonner'

// Schema for creating new location (requires clientId)
const createLocationSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  name: z.string().min(1, 'Name is required'),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  logoUrl: z.string().optional().or(z.literal('')),
  accessInstructions: z.string().optional(),
  serviceNotes: z.string().optional(),
  painPoints: z.string().optional(),
  checklistTemplateId: z.string().optional().or(z.literal('')),
  equipmentInventory: z.string().optional(), // JSON string for now
})

// Schema for editing location (clientId required to allow reassignment)
const editLocationSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  name: z.string().min(1, 'Name is required'),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  logoUrl: z.string().optional().or(z.literal('')),
  accessInstructions: z.string().optional(),
  serviceNotes: z.string().optional(),
  painPoints: z.string().optional(),
  checklistTemplateId: z.string().optional().or(z.literal('')),
  equipmentInventory: z.string().optional(), // JSON string for now
})

type LocationFormValues = z.infer<typeof createLocationSchema> | z.infer<typeof editLocationSchema>

interface LocationFormProps {
  clientId?: string // Optional - if not provided, user must select
  location?: any
  children: React.ReactNode
}

export function LocationForm({ clientId: propClientId, location, children }: LocationFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const router = useRouter()

  const address = (location?.address as any) || {}
  const equipmentInventory = location?.equipmentInventory as any[]
  const equipmentStr = Array.isArray(equipmentInventory)
    ? equipmentInventory.map((item: any) => 
        typeof item === 'string' ? item : item.name || JSON.stringify(item)
      ).join('\n')
    : ''

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(location ? editLocationSchema : createLocationSchema) as any,
    defaultValues: {
      clientId: propClientId || location?.clientId || '',
      name: location?.name || '',
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zip: address.zip || '',
      logoUrl: location?.logoUrl || '',
      accessInstructions: location?.accessInstructions || '',
      serviceNotes: location?.serviceNotes || '',
      painPoints: location?.painPoints || '',
      checklistTemplateId: location?.checklistTemplateId || '',
      equipmentInventory: equipmentStr,
    },
  })

  // Fetch checklist templates and clients when dialog opens
  useEffect(() => {
    if (open) {
      // Fetch checklist templates
      fetch('/api/checklists')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setChecklistTemplates(data.filter((t: any) => t.isActive))
          }
        })
        .catch(() => {
          // Silently fail - templates are optional
        })

      // Fetch clients if we need to show client selector (when creating without clientId, or when editing)
      if (!propClientId || location) {
        fetch('/api/clients')
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setClients(data.filter((c: any) => c.status === 'active'))
            }
          })
          .catch(() => {
            // Silently fail
          })
      }
    }
  }, [open, propClientId, location])

  const onSubmit = async (data: LocationFormValues) => {
    setLoading(true)
    try {
      const addressData = {
        street: data.street || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
      }

      // Parse equipment inventory from text (one item per line)
      const equipmentInventory = data.equipmentInventory
        ? data.equipmentInventory
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((name) => ({ name }))
        : []

      const payload: any = {
        name: data.name,
        address: addressData,
        logoUrl: data.logoUrl || null,
        accessInstructions: data.accessInstructions,
        serviceNotes: data.serviceNotes,
        painPoints: data.painPoints,
        checklistTemplateId: data.checklistTemplateId || null,
        equipmentInventory,
      }

      if (location) {
        // Update existing location - include clientId if it changed
        const updatePayload = {
          ...payload,
          ...(data.clientId && data.clientId !== location.clientId && {
            clientId: data.clientId,
          }),
        }

        const response = await fetch(`/api/locations/${location.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update location')
        }

        toast.success('Location updated')
      } else {
        // Create new location - use clientId from form or prop
        const targetClientId = data.clientId || propClientId
        if (!targetClientId) {
          throw new Error('Client is required')
        }

        const response = await fetch(`/api/clients/${targetClientId}/locations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create location')
        }

        toast.success('Location created')
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {location ? 'Edit Location' : 'Add New Location'}
          </DialogTitle>
          <DialogDescription>
            {location
              ? 'Update location information and reassign to a different client if needed'
              : propClientId
                ? 'Add a new location for this client'
                : 'Add a new location and select the client'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {(!propClientId || location) && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
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
                    <FormDescription>
                      {location
                        ? 'Reassign this location to a different client if needed'
                        : 'Select the client this location belongs to'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo/Image</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || undefined}
                      onChange={field.onChange}
                      folder="locations"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Office" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Address</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="ZIP Code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="accessInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Gate code, door code, key location, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Special instructions, equipment notes, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="painPoints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pain Points</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Known issues, recurring problems, client concerns..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Track recurring issues or concerns at this location
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="checklistTemplateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Checklist Template</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value === '__none__' ? '' : value)
                    }}
                    value={field.value || '__none__'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select checklist template (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {checklistTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Assign a checklist template for service execution
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="equipmentInventory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment Inventory</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hood 1&#10;Hood 2&#10;Fryer 1&#10;Grill..."
                      className="resize-none font-mono text-sm"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    List equipment items, one per line
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
                  : location
                    ? 'Update Location'
                    : 'Create Location'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}



