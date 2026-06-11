'use client'

// Row actions for the Recurring Expenses tables: a kebab menu holding
// Edit + Delete. Delete never sits red inline — it confirms through an
// alert dialog (destructive red lives only inside that dialog), matching
// the confirm-delete-button flow (DELETE endpoint, toast, route refresh).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ExpenseFormDialog } from '@/components/financials/expense-form-dialog'

interface ExpenseRowActionsProps {
  expense: {
    id: string
    name: string
    category: string
    expenseType: string
    monthlyAmount: string | number
    vendor: string | null
    paymentMethod: string | null
    billingDay: number
    startDate: string
    endDate: string | null
    isActive: boolean
    notes: string | null
  }
}

export function ExpenseRowActions({ expense }: ExpenseRowActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/financials/expenses/${expense.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete expense')
      }
      toast.success(`Deleted ${expense.name}`)
      setConfirmOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete expense')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${expense.name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mounted fresh on each open so the form re-reads the row's values. */}
      {editOpen && (
        <ExpenseFormDialog expense={expense} open={editOpen} onOpenChange={setEditOpen} />
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <span className="font-medium text-foreground">{expense.name}</span>{' '}
              from your recurring expenses. Monthly totals and the Financials dashboard update
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
