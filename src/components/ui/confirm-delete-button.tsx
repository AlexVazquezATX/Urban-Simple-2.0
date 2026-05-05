'use client'

// Reusable "delete with confirmation" button. Pops a dialog asking the user to
// confirm. On confirm, sends DELETE to the given endpoint and refreshes the
// route. Used for Client + Location row deletes (and anywhere else we need a
// soft-delete confirmation).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDeleteButtonProps {
  endpoint: string // DELETE target, e.g. /api/clients/abc123
  entityLabel: string // shown in the dialog, e.g. "Caroline (White Lodging)"
  entityKind: string // e.g. "client", "location"
  onDeleted?: () => void
  redirectTo?: string // navigate to this route after delete
  buttonLabel?: string
  variant?: 'ghost' | 'outline' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function ConfirmDeleteButton({
  endpoint,
  entityLabel,
  entityKind,
  onDeleted,
  redirectTo,
  buttonLabel = 'Delete',
  variant = 'ghost',
  size = 'sm',
  className,
}: ConfirmDeleteButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    try {
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to delete ${entityKind}`)
      }
      toast.success(`Deleted ${entityLabel}`)
      setOpen(false)
      if (onDeleted) onDeleted()
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to delete ${entityKind}`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className ?? 'h-7 text-xs rounded-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30'}
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {entityKind}?</DialogTitle>
          <DialogDescription>
            This will soft-delete <span className="font-medium">{entityLabel}</span>. It will be hidden from all lists but historical data (invoices, payments, service logs) is preserved. Reversible if you need to restore it later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={deleting} className="rounded-sm">
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-sm bg-red-600 hover:bg-red-700"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
