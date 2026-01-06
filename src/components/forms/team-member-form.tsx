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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

const teamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'ASSOCIATE', 'CLIENT_USER']),
  branchId: z.string().optional().or(z.literal('')),
  password: z.string().optional(),
  createAuthAccount: z.boolean().default(false),
})

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>

interface TeamMemberFormProps {
  member?: any
  branches?: Array<{ id: string; name: string; code: string }>
  children: React.ReactNode
}

export function TeamMemberForm({ member, branches = [], children }: TeamMemberFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema) as any,
    defaultValues: {
      email: member?.email || '',
      firstName: member?.firstName || '',
      lastName: member?.lastName || '',
      displayName: member?.displayName || '',
      phone: member?.phone || '',
      role: member?.role || 'ASSOCIATE',
      branchId: member?.branchId || '',
      password: '',
      createAuthAccount: false,
    },
  })

  const createAuthAccount = form.watch('createAuthAccount')

  useEffect(() => {
    if (member) {
      form.reset({
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        displayName: member.displayName || '',
        phone: member.phone || '',
        role: member.role,
        branchId: member.branchId || '',
        password: '',
        createAuthAccount: false,
      })
    } else {
      form.reset({
        email: '',
        firstName: '',
        lastName: '',
        displayName: '',
        phone: '',
        role: 'ASSOCIATE',
        branchId: '',
        password: '',
        createAuthAccount: true,
      })
    }
  }, [member, form])

  const onSubmit = async (data: TeamMemberFormValues) => {
    setLoading(true)
    try {
      const payload: any = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName || undefined,
        phone: data.phone || undefined,
        role: data.role,
        branchId: data.branchId || undefined,
      }

      if (member) {
        // Update existing member
        if (data.createAuthAccount && data.password) {
          payload.password = data.password
        }

        const response = await fetch(`/api/users/${member.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update member')
        }

        toast.success('Team member updated')
      } else {
        // Create new member
        if (data.createAuthAccount && data.password) {
          payload.password = data.password
        } else if (data.createAuthAccount && !data.password) {
          throw new Error('Password is required when creating an auth account')
        }

        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create member')
        }

        toast.success('Team member added')
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
            {member ? 'Edit Team Member' : 'Add Team Member'}
          </DialogTitle>
          <DialogDescription>
            {member
              ? 'Update team member information'
              : 'Add a new team member to your organization'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional. Defaults to first and last name.
                  </FormDescription>
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
                    <Input type="tel" placeholder="(512) 555-1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="ASSOCIATE">Associate</SelectItem>
                        <SelectItem value="CLIENT_USER">Client User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {branches.length > 0 && (
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value === '__none__' ? '' : value)
                        }}
                        value={field.value || '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">All Branches</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {!member && (
              <>
                <FormField
                  control={form.control}
                  name="createAuthAccount"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Create Login Account</FormLabel>
                        <FormDescription>
                          Allow this user to log in to the platform
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {createAuthAccount && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter password"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          User will be able to log in with this email and password
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

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
                {loading ? 'Saving...' : member ? 'Update Member' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

