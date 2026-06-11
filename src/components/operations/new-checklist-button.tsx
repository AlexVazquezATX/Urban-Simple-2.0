'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

/**
 * Creates a blank template and drops you straight into the builder — no
 * modal step. The name starts as "Untitled checklist" and is renamed
 * inline in the builder.
 */
export function NewChecklistButton({
  variant = 'gold',
  label = 'New Template',
}: {
  variant?: 'gold' | 'outline'
  label?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const create = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled checklist', sections: [] }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to create checklist')
      }
      const tpl = await res.json()
      router.push(`/operations/checklists/${tpl.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to create checklist')
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} onClick={create} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      {label}
    </Button>
  )
}
