'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ManagerOption = {
  id: string
  firstName: string
  lastName: string
  displayName?: string | null
  role: string
  isActive: boolean
}

type ManagerAssignmentDialogProps =
  | {
      mode: 'route'
      locationId: string
      date: string
      locationLabel: string
      currentManagerId?: string | null
      buttonLabel?: string
    }
  | {
      mode: 'shift'
      shiftId: string
      locationLabel: string
      currentManagerId?: string | null
      buttonLabel?: string
    }

export function ManagerAssignmentDialog(props: ManagerAssignmentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [selectedManagerId, setSelectedManagerId] = useState<string>(
    props.currentManagerId || ''
  )

  useEffect(() => {
    setSelectedManagerId(props.currentManagerId || '')
  }, [props.currentManagerId, open])

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    const loadManagers = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/users')
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load managers')
        }

        const userList = Array.isArray(payload.users) ? payload.users : []
        const managerList = userList.filter(
          (user: ManagerOption) =>
            user.isActive && (user.role === 'MANAGER' || user.role === 'ADMIN')
        )

        if (!cancelled) {
          setManagers(managerList)
        }
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to load managers')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadManagers()

    return () => {
      cancelled = true
    }
  }, [open])

  const selectedManagerName = useMemo(() => {
    const manager = managers.find((entry) => entry.id === selectedManagerId)
    if (!manager) {
      return null
    }

    return manager.displayName || `${manager.firstName} ${manager.lastName}`.trim()
  }, [managers, selectedManagerId])

  const handleSubmit = async () => {
    if (!selectedManagerId) {
      toast.error('Please choose a manager')
      return
    }

    setSaving(true)
    try {
      let response: Response

      if (props.mode === 'route') {
        response = await fetch('/api/operations/dispatch/route', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locationId: props.locationId,
            date: props.date,
            managerId: selectedManagerId,
          }),
        })
      } else {
        response = await fetch(`/api/shifts/${props.shiftId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            managerId: selectedManagerId,
          }),
        })
      }

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to assign manager')
      }

      toast.success(
        `${selectedManagerName || 'Manager'} assigned to ${props.locationLabel}.`
      )
      setOpen(false)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign manager')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 rounded-sm px-2 text-xs">
          <UserCog className="mr-1 h-3 w-3" />
          {props.buttonLabel || 'Assign Manager'}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-display font-medium text-warm-900 dark:text-cream-100">
            Assign Manager
          </DialogTitle>
          <DialogDescription className="text-sm text-warm-500 dark:text-cream-400">
            {props.locationLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Select
            value={selectedManagerId}
            onValueChange={setSelectedManagerId}
            disabled={loading || saving}
          >
            <SelectTrigger className="w-full rounded-sm">
              <SelectValue placeholder={loading ? 'Loading managers...' : 'Choose a manager'} />
            </SelectTrigger>
            <SelectContent>
              {managers.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.displayName || `${manager.firstName} ${manager.lastName}`.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || saving || !selectedManagerId}
            className="rounded-sm"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Assignment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
