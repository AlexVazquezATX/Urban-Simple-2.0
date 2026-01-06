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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const checklistSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameEs: z.string().optional(),
  description: z.string().optional(),
})

type ChecklistFormValues = z.infer<typeof checklistSchema>

interface ChecklistFormProps {
  template?: any
  children: React.ReactNode
}

export function ChecklistForm({ template, children }: ChecklistFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistSchema) as any,
    defaultValues: {
      name: template?.name || '',
      nameEs: template?.nameEs || '',
      description: template?.description || '',
    },
  })

  const onSubmit = async (data: ChecklistFormValues) => {
    setLoading(true)
    try {
      // If editing, redirect to edit page
      if (template) {
        router.push(`/operations/checklists/${template.id}`)
        setOpen(false)
        return
      }

      // Create new template with empty sections
      const response = await fetch('/api/checklists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          sections: [],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create template')
      }

      const newTemplate = await response.json()
      toast.success('Template created')
      setOpen(false)
      router.push(`/operations/checklists/${newTemplate.id}`)
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
            {template ? 'Edit Template' : 'Create New Checklist Template'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Update template information'
              : 'Start by giving your template a name. You can add sections and items on the next page.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Kitchen Cleaning Checklist" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nameEs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spanish Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Lista de Verificación de Limpieza de Cocina" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this checklist template..."
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
                {loading
                  ? 'Saving...'
                  : template
                    ? 'Continue Editing'
                    : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}


