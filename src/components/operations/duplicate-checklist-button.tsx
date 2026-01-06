'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface DuplicateChecklistButtonProps {
  templateId: string
  templateName: string
}

export function DuplicateChecklistButton({
  templateId,
  templateName,
}: DuplicateChecklistButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(`${templateName} (Copy)`)
  const [loading, setLoading] = useState(false)

  const handleDuplicate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the duplicate')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/checklists/${templateId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate template')
      }

      const duplicate = await response.json()
      toast.success('Checklist duplicated successfully')
      setOpen(false)
      router.push(`/operations/checklists/${duplicate.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to duplicate checklist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Copy className="h-4 w-4 mr-1" />
          Duplicate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Checklist</DialogTitle>
          <DialogDescription>
            Create a copy of "{templateName}" with a new name
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="duplicate-name">New Checklist Name *</Label>
            <Input
              id="duplicate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name for duplicate..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleDuplicate()
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={loading}>
            {loading ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


